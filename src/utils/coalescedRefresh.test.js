import { createCoalescedRefresh } from "./coalescedRefresh";

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("bursts share one running request and get one trailing refresh", async () => {
  let release;
  const run = jest.fn(() => new Promise(resolve => { release = resolve; }));
  const refresh = createCoalescedRefresh(run, 3000);
  refresh.request();
  for (let i = 0; i < 100; i++) refresh.request();
  jest.advanceTimersByTime(10000);
  expect(run).toHaveBeenCalledTimes(1);
  release();
  await flush();
  jest.advanceTimersByTime(2999);
  expect(run).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(1);
  expect(run).toHaveBeenCalledTimes(2);
  refresh.dispose();
  release();
  await flush();
});

test("dispose drops queued requests on logout or identity change", async () => {
  let release;
  const run = jest.fn(() => new Promise(resolve => { release = resolve; }));
  const refresh = createCoalescedRefresh(run);
  refresh.request();
  refresh.request();
  refresh.dispose();
  release();
  await flush();
  jest.advanceTimersByTime(30000);
  refresh.request();
  expect(run).toHaveBeenCalledTimes(1);
});

test("errors do not create an automatic retry loop", async () => {
  const run = jest.fn().mockRejectedValue(new Error("offline"));
  const refresh = createCoalescedRefresh(run);
  refresh.request();
  await flush();
  jest.advanceTimersByTime(30000);
  expect(run).toHaveBeenCalledTimes(1);
  refresh.request();
  await flush();
  expect(run).toHaveBeenCalledTimes(2);
  refresh.dispose();
});
