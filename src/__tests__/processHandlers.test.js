const server = require('../server').default || require('../server');

afterAll(() => {
  server.close();
});

test('logs unhandled rejections', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  process.emit('unhandledRejection', new Error('test'), Promise.resolve());
  expect(consoleSpy).toHaveBeenCalled();
  consoleSpy.mockRestore();
});

test('logs uncaught exceptions and exits', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('exit');
  });
  expect(() => {
    process.emit('uncaughtException', new Error('test'));
  }).toThrow('exit');
  expect(consoleSpy).toHaveBeenCalled();
  consoleSpy.mockRestore();
  exitSpy.mockRestore();
});
