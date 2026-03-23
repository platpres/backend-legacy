const deleteObjectMock = jest.fn((_params, cb) => cb(null, {}));
const sendMock = jest.fn((command: any) => {
  if (command?.constructor?.name === 'DescribeEndpointsCommand') {
    return Promise.resolve({ Endpoints: [{ Url: 'https://mediaconvert.example.com' }] });
  }
  if (command?.constructor?.name === 'CreateJobCommand') {
    return Promise.resolve({ Job: { Id: 'job-1' } });
  }
  if (command?.constructor?.name === 'GetJobCommand') {
    return Promise.resolve({ Job: { Status: 'COMPLETE' } });
  }
  return Promise.reject(new Error('Unknown command'));
});

const s3CtorMock = jest.fn(() => ({
  deleteObject: deleteObjectMock,
}));

const mediaConvertCtorMock = jest.fn((options?: any) => ({
  _options: options,
  send: sendMock,
}));

jest.mock('s3fs', () =>
  jest.fn().mockImplementation(() => ({
    writeFile: jest.fn().mockResolvedValue(undefined),
  })),
);

jest.mock('aws-sdk', () => ({
  S3: s3CtorMock,
}));

jest.mock('@aws-sdk/client-mediaconvert', () => ({
  MediaConvertClient: mediaConvertCtorMock,
  DescribeEndpointsCommand: function DescribeEndpointsCommand(input: any) {
    this.input = input;
  },
  CreateJobCommand: function CreateJobCommand(input: any) {
    this.input = input;
  },
  GetJobCommand: function GetJobCommand(input: any) {
    this.input = input;
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const helper = require('./transcoder.helper');

describe('transcoder.helper MediaConvert migration', () => {
  const originalRole = process.env.AWS_MEDIACONVERT_ROLE_ARN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_MEDIACONVERT_ROLE_ARN =
      'arn:aws:iam::123456789012:role/MediaConvertRole';
  });

  afterAll(() => {
    process.env.AWS_MEDIACONVERT_ROLE_ARN = originalRole;
  });

  it('creates gif transcode job with MediaConvert and returns gif URI', async () => {
    helper.setCredentials('key', 'secret');
    const result = await helper.generateGif('public/42/demo.mp4');

    expect(mediaConvertCtorMock).toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          MaxResults: 1,
        }),
      }),
    );
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Role: process.env.AWS_MEDIACONVERT_ROLE_ARN,
          Settings: expect.any(Object),
        }),
      }),
    );
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { Id: 'job-1' },
      }),
    );
    expect(result.gifUri).toBe(
      'https://s3.amazonaws.com/platpres-digital2/public/42/demo-gif.gif',
    );
  });
});
