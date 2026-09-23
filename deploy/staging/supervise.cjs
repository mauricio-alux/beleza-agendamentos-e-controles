'use strict';
// One supervised lifecycle for the gateway (parent) and its two Node children.
function supervise(server, {exit = code => process.exit(code), graceMs = 4000} = {}) {
  const children = new Set();
  let stopping = false, closed = false, finished = false, code = 0, timer;
  const finish = () => {
    if (!finished && stopping && closed && children.size === 0) {
      finished = true;
      clearTimeout(timer);
      exit(code);
    }
  };
  function shutdown(status = 1) {
    if (stopping) return;
    stopping = true; code = status;
    timer = setTimeout(() => {
      for (const child of children) child.kill('SIGKILL');
      // A child that does not terminate within the grace window is a failure.
      if (!finished) {finished = true; exit(1);}
    }, graceMs);
    for (const child of children) child.kill('SIGTERM');
    server.close(() => {closed = true; finish();});
    server.closeAllConnections?.();
    finish();
  }
  server.on('error', () => shutdown(1));
  server.on('close', () => {if (!stopping) shutdown(1);});
  function watch(child) {
    children.add(child);
    child.once('error', () => shutdown(1));
    child.once('close', () => {
      children.delete(child);
      if (!stopping) shutdown(1);
      finish();
    });
  }
  return {watch, shutdown, get stopping() {return stopping;}};
}
module.exports = {supervise};

