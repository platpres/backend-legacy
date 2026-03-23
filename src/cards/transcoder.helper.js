'use strict';
var AWS = require('aws-sdk');
var S3FS = require('s3fs');
const fs = require('fs');
const path = require('path');

const bucket = 'platpres-digital2';
var elastictranscoder;
var s3;
var accessKeyId;
var secretAccessKey;
var awsOptions;

var setCredentials = function(_accessKeyId, _secretAccessKey) {
  accessKeyId = _accessKeyId;
  secretAccessKey = _secretAccessKey;

  awsOptions = {
    region: 'us-east-1',
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  };
  elastictranscoder = new AWS.ElasticTranscoder(awsOptions);
  s3 = new AWS.S3(awsOptions);
}

var getTranscodeMovMp4Params = function(s3Path) {
  var dir = path.dirname(s3Path) + '/';
  var file = path.basename(s3Path, path.extname(s3Path));
  var outFile = dir + file + '-processed.mp4';

  var params = {
    PipelineId: '1538112760402-gdjs4m',
    Input: {
      AspectRatio: 'auto',
      Container: 'auto',
      FrameRate: 'auto',
      Interlaced: 'auto',
      Key: s3Path,
      Resolution: 'auto',
      TimeSpan: {
        Duration: '180.000',
      },
    },
    Outputs: [{
      Key: outFile,
      PresetId: '1351620000001-000010',
      Rotate: 'auto',
      ThumbnailPattern: dir + file + '-{count}',
    }],
    UserMetadata: {},
  };
  return {params, outFile};
};

var getTranscodeGifParams = function(s3Path) {
  var dir = path.dirname(s3Path) + '/';
  var file = path.basename(s3Path, path.extname(s3Path));
  var gifPath = dir + file + '.gif';
  var mp4Path = dir + file + '-processed.mp4';
  var pngPath = dir + file + '-00001.png';
  var params = {
    PipelineId: '1538112760402-gdjs4m',
    Input: {
      AspectRatio: 'auto',
      Container: 'auto',
      FrameRate: 'auto',
      Interlaced: 'auto',
      Key: s3Path,
      Resolution: 'auto',
      TimeSpan: {
        Duration: '10.000',
      },
    },
    Outputs: [{
      Key: dir + file + '.gif',
      PresetId: '1351620000001-100200',
      Rotate: 'auto',
      ThumbnailPattern: dir + file + '-{count}',
    }, {
      Key: dir + file + '-processed.mp4',
      PresetId: '1351620000001-000010',
      Rotate: 'auto',
    }],
    UserMetadata: {},
  };
  return {params, gifPath, pngPath, mp4Path};
};

var deleteGifPng = function(gifPath, mp4Path, pngPath, cb) {
  s3.deleteObject({
    Bucket: bucket,
    Key: gifPath,
  }, (err) => {
    // if(err) return cb(err);
    s3.deleteObject({
      Bucket: bucket,
      Key: mp4Path,
    }, (err) => {
      s3.deleteObject({
        Bucket: bucket,
        Key: pngPath,
      }, cb);
    });
  });
};

var generateGif = function(s3Path) {
  return new Promise((resolve, reject) => {
    var rsp = getTranscodeGifParams(s3Path);
    var params = rsp.params;

    deleteGifPng(rsp.gifPath, rsp.mp4Path, rsp.pngPath, function(err) {
      console.log('prev gif and png deleted');
      elastictranscoder.createJob(params, function(err, data) {
        if (err) {
          console.log('error creating transcoder job');
          return reject(err);
        }

        elastictranscoder.waitFor('jobComplete', {
          Id: data.Job.Id,
        }, function(err, data) {
          if (err) {
            console.log('error waiting for job to complete');
            return reject(err);
          }

          var dir = path.dirname(s3Path) + '/';
          var file = path.basename(s3Path, path.extname(s3Path));
          var gifPath = dir + file + '.gif';
          var gifUri = 'https://s3.amazonaws.com/platpres-digital2/' +
            gifPath;
          console.log('completed! =>', gifUri);
          var rsp = {data, gifUri};
          resolve(rsp);
        });
      });
    });
  });
};

var generateMovMp4 = function(s3Path) {
  return new Promise((resolve, reject) => {
    var rsp = getTranscodeMovMp4Params(s3Path);
    var params = rsp.params;

    s3.deleteObject({
      Bucket: bucket,
      Key: rsp.outFile,
    }, (err) => {
      console.log('prev mov/mp4 deleted');
      elastictranscoder.createJob(params, function(err, data) {
        if (err) {
          console.log('error creating transcoder job');
          return reject(err);
        }

        elastictranscoder.waitFor('jobComplete', {
          Id: data.Job.Id,
        }, function(err, data) {
          if (err) {
            console.log('error waiting for job to complete');
            return reject(err);
          }

          var dir = path.dirname(s3Path) + '/';
          var file = path.basename(s3Path, path.extname(s3Path));
          var fPath = dir + file;
          var fUri = 'https://s3.amazonaws.com/platpres-digital2/' +
            fPath + '-processed.mp4';
          var tUri = 'https://s3.amazonaws.com/platpres-digital2/' +
            fPath + '-00001.png';
          console.log('completed! =>', fUri);
          var rsp = {data, fUri, tUri};
          resolve(rsp);
        });
      });
    });
  });
};

var uploadToS3 = function(filePath, s3FilePath, folder) {
  var s3Fs = new S3FS(bucket, awsOptions);
  var fileName = path.basename(s3FilePath);
  var s3Path = 'public/' + folder + '/' + fileName;
  var stream = fs.createReadStream(filePath);

  return new Promise((resolve, reject) => {
    s3Fs.writeFile(s3Path, stream, {ACL: 'public-read'}).then(function() {
      var uri = 'https://s3.amazonaws.com/platpres-digital2/' +
          s3Path;  
      resolve(uri);
      
      // console.log('Video', filePath, 'has been uploaded to s3, removing ' +
      //   'file locally');

      // fs.unlink(filePath, function(err) {
      //   if (err && err.code != 'ENOENT') {
      //     return reject(err);
      //   }

      //   var uri = 'https://s3.amazonaws.com/platpres-digital2/' +
      //     s3Path;
      //   resolve(uri);
      // });
    }).catch((reason) => {
      reject(reason);
    });
  });
};

exports.setCredentials = setCredentials;
exports.uploadToS3 = uploadToS3;
exports.generateGif = generateGif;
exports.generateMovMp4 = generateMovMp4;