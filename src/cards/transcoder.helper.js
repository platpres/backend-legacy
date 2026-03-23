'use strict';
var AWS = require('aws-sdk');
const {
  MediaConvertClient,
  DescribeEndpointsCommand,
  CreateJobCommand,
  GetJobCommand,
} = require('@aws-sdk/client-mediaconvert');
var S3FS = require('s3fs');
const fs = require('fs');
const path = require('path');

const bucket = 'platpres-digital2';
var s3;
var mediaConvert;
var accessKeyId;
var secretAccessKey;
var awsOptions;
var mediaConvertEndpointPromise;

var setCredentials = function(_accessKeyId, _secretAccessKey) {
  accessKeyId = _accessKeyId;
  secretAccessKey = _secretAccessKey;

  awsOptions = {
    region: 'us-east-1',
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  };
  s3 = new AWS.S3(awsOptions);
  mediaConvert = null;
  mediaConvertEndpointPromise = null;
}

var getMediaConvertClient = function() {
  if (mediaConvert) {
    return Promise.resolve(mediaConvert);
  }

  if (mediaConvertEndpointPromise) {
    return mediaConvertEndpointPromise;
  }

  var endpointFromEnv = process.env.AWS_MEDIACONVERT_ENDPOINT;
  if (endpointFromEnv) {
    mediaConvert = new MediaConvertClient({
      ...awsOptions,
      endpoint: endpointFromEnv,
    });
    return Promise.resolve(mediaConvert);
  }

  var bootstrapClient = new MediaConvertClient(awsOptions);
  mediaConvertEndpointPromise = bootstrapClient.send(new DescribeEndpointsCommand({ MaxResults: 1 }))
    .then(function(response) {
      if (!response.Endpoints || !response.Endpoints.length) {
        throw new Error('MediaConvert endpoint not found');
      }

      mediaConvert = new MediaConvertClient({
        ...awsOptions,
        endpoint: response.Endpoints[0].Url.replace(/\/$/, ''),
      });
      return mediaConvert;
    })
    .finally(function() {
      mediaConvertEndpointPromise = null;
    });

  return mediaConvertEndpointPromise;
};

var waitForMediaConvertJobComplete = function(client, jobId) {
  return new Promise((resolve, reject) => {
    var retries = 180;

    var poll = function() {
      client.send(new GetJobCommand({ Id: jobId })).then(function(data) {
        var status = data && data.Job && data.Job.Status;
        if (status === 'COMPLETE') {
          return resolve(data);
        }

        if (status === 'ERROR' || status === 'CANCELED') {
          return reject(new Error('MediaConvert job finished with status: ' + status));
        }

        retries -= 1;
        if (retries <= 0) {
          return reject(new Error('Timed out waiting for MediaConvert job completion'));
        }

        setTimeout(poll, 5000);
      }).catch(function(err) {
        reject(err);
      });
    };

    poll();
  });
};

var getMediaConvertRole = function() {
  var roleArn = process.env.AWS_MEDIACONVERT_ROLE_ARN;
  if (!roleArn) {
    throw new Error('AWS_MEDIACONVERT_ROLE_ARN is required to create MediaConvert jobs');
  }
  return roleArn;
};

var getTranscodeMovMp4Params = function(s3Path) {
  var dir = path.dirname(s3Path) + '/';
  var file = path.basename(s3Path, path.extname(s3Path));
  var outFile = dir + file + '-processed.mp4';

  var params = {
    Role: getMediaConvertRole(),
    Settings: {
      Inputs: [{
        FileInput: 's3://' + bucket + '/' + s3Path,
        TimecodeSource: 'ZEROBASED',
        InputClippings: [{
          StartTimecode: '00:00:00:00',
          EndTimecode: '00:03:00:00',
        }],
      }],
      OutputGroups: [{
        Name: 'File Group',
        OutputGroupSettings: {
          Type: 'FILE_GROUP_SETTINGS',
          FileGroupSettings: {
            Destination: 's3://' + bucket + '/' + dir,
          },
        },
        Outputs: [{
          NameModifier: '-processed',
          ContainerSettings: { Container: 'MP4' },
          VideoDescription: {
            CodecSettings: {
              Codec: 'H_264',
              H264Settings: {
                RateControlMode: 'QVBR',
                QvbrSettings: { QvbrQualityLevel: 7 },
                MaxBitrate: 4000000,
              },
            },
          },
        }, {
          NameModifier: '-',
          ContainerSettings: { Container: 'RAW' },
          VideoDescription: {
            CodecSettings: {
              Codec: 'FRAME_CAPTURE',
              FrameCaptureSettings: {
                FramerateNumerator: 1,
                FramerateDenominator: 1,
                MaxCaptures: 1,
                Quality: 80,
              },
            },
          },
        }],
      }],
    },
  };
  return {params, outFile};
};

var getTranscodeGifParams = function(s3Path) {
  var dir = path.dirname(s3Path) + '/';
  var file = path.basename(s3Path, path.extname(s3Path));
  var gifPath = dir + file + '-gif.gif';
  var mp4Path = dir + file + '-processed.mp4';
  var pngPath = dir + file + '-00001.png';
  var params = {
    Role: getMediaConvertRole(),
    Settings: {
      Inputs: [{
        FileInput: 's3://' + bucket + '/' + s3Path,
        TimecodeSource: 'ZEROBASED',
        InputClippings: [{
          StartTimecode: '00:00:00:00',
          EndTimecode: '00:00:10:00',
        }],
      }],
      OutputGroups: [{
        Name: 'File Group',
        OutputGroupSettings: {
          Type: 'FILE_GROUP_SETTINGS',
          FileGroupSettings: {
            Destination: 's3://' + bucket + '/' + dir,
          },
        },
        Outputs: [{
          NameModifier: '-gif',
          ContainerSettings: { Container: 'GIF' },
          VideoDescription: {
            CodecSettings: {
              Codec: 'GIF',
              GifSettings: {
                FramerateControl: 'INITIALIZE_FROM_SOURCE',
              },
            },
          },
        }, {
          NameModifier: '-processed',
          ContainerSettings: { Container: 'MP4' },
          VideoDescription: {
            CodecSettings: {
              Codec: 'H_264',
              H264Settings: {
                RateControlMode: 'QVBR',
                QvbrSettings: { QvbrQualityLevel: 7 },
                MaxBitrate: 4000000,
              },
            },
          },
        }, {
          NameModifier: '-',
          ContainerSettings: { Container: 'RAW' },
          VideoDescription: {
            CodecSettings: {
              Codec: 'FRAME_CAPTURE',
              FrameCaptureSettings: {
                FramerateNumerator: 1,
                FramerateDenominator: 1,
                MaxCaptures: 1,
                Quality: 80,
              },
            },
          },
        }],
      }],
    },
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

    deleteGifPng(rsp.gifPath, rsp.mp4Path, rsp.pngPath, function() {
      console.log('prev gif and png deleted');
      getMediaConvertClient().then(function(client) {
        client.send(new CreateJobCommand(params)).then(function(data) {
          waitForMediaConvertJobComplete(client, data.Job.Id).then(function(jobData) {
            var dir = path.dirname(s3Path) + '/';
            var file = path.basename(s3Path, path.extname(s3Path));
            var gifPath = dir + file + '-gif.gif';
            var gifUri = 'https://s3.amazonaws.com/platpres-digital2/' +
              gifPath;
            console.log('completed! =>', gifUri);
            var response = {data: jobData, gifUri};
            resolve(response);
          }).catch(function(waitErr) {
            console.log('error waiting for job to complete');
            reject(waitErr);
          });
        }).catch(function(err) {
          console.log('error creating transcoder job');
          reject(err);
        });
      }).catch(function(clientErr) {
        reject(clientErr);
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
    }, () => {
      console.log('prev mov/mp4 deleted');
      getMediaConvertClient().then(function(client) {
        client.send(new CreateJobCommand(params)).then(function(data) {
          waitForMediaConvertJobComplete(client, data.Job.Id).then(function(jobData) {
            var dir = path.dirname(s3Path) + '/';
            var file = path.basename(s3Path, path.extname(s3Path));
            var fPath = dir + file;
            var fUri = 'https://s3.amazonaws.com/platpres-digital2/' +
              fPath + '-processed.mp4';
            var tUri = 'https://s3.amazonaws.com/platpres-digital2/' +
              fPath + '-00001.png';
            console.log('completed! =>', fUri);
            var response = {data: jobData, fUri, tUri};
            resolve(response);
          }).catch(function(waitErr) {
            console.log('error waiting for job to complete');
            reject(waitErr);
          });
        }).catch(function(err) {
          console.log('error creating transcoder job');
          reject(err);
        });
      }).catch(function(clientErr) {
        reject(clientErr);
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