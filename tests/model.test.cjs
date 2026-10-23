const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Hologram} = require('../model.js');

test('appearance fades in and reaches a stable visible state', () => {
  const robot = new Hologram();
  robot.show(1000); robot.tick(1500);
  assert.ok(robot.opacity > 0 && robot.opacity < 1);
  robot.tick(5000);
  assert.equal(robot.phase, 'visible');
  assert.equal(robot.opacity, 1);
});
test('dismissal fades out and becomes fully hidden', () => {
  const robot = new Hologram();
  robot.show(0); robot.tick(3000); robot.hide(4000); robot.tick(4500);
  assert.ok(robot.opacity > 0 && robot.opacity < 1);
  robot.tick(8000);
  assert.equal(robot.phase, 'hidden');
  assert.equal(robot.opacity, 0);
});
test('calling during dismissal reverses smoothly without flashing', () => {
  const robot = new Hologram();
  robot.show(0); robot.tick(3000); robot.hide(4000); robot.tick(4500);
  const before = robot.opacity;
  robot.show(4500);
  assert.equal(robot.opacity, before);
  robot.tick(4700);
  assert.ok(robot.opacity > before);
});
test('calling an already visible robot keeps it visible', () => {
  const robot = new Hologram();
  robot.show(0); robot.tick(3000); robot.show(4000); robot.tick(4100);
  assert.equal(robot.phase, 'visible');
  assert.equal(robot.opacity, 1);
});
test('only supported hand gestures are accepted', () => {
  const robot = new Hologram();
  robot.setGesture('point');
  assert.equal(robot.gesture, 'point');
  robot.setGesture('untrusted');
  assert.equal(robot.gesture, 'point');
});
