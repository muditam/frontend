/* eslint-disable testing-library/no-unnecessary-act -- These tests use React DOM directly, which requires act; no Testing Library utilities are used. */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import axios from 'axios';
import OutreachForm from './HealthExpertOutreach';

jest.mock('axios', () => {
  const api = { put: jest.fn(), post: jest.fn() };
  return { create: () => api, ...api };
});
jest.mock('./CoachCheckoutDialog', () => () => null);

let container;
let root;
const lead = { _id: 'customer-1', rtNextFollowupDate: '2026-11-19' };
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  jest.clearAllMocks();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test('calendar saves immediately, disables duplicate edits while saving, and does not log a call', async () => {
  let resolve;
  axios.put.mockImplementation(() => new Promise(done => { resolve = done; }));
  const onSaved = jest.fn();
  act(() => root.render(<OutreachForm lead={lead} onSaved={onSaved} />));
  act(() => Simulate.change(container.querySelector('input[type="date"]'), { target: { value: '2026-11-20' } }));
  expect(axios.put).toHaveBeenCalledWith('/api/health-expert/leads/customer-1/followup', { nextFollowupDate: '2026-11-20' });
  expect(container.querySelector('fieldset').disabled).toBe(true);
  const item = { ...lead, rtNextFollowupDate: '2026-11-20' };
  await act(async () => resolve({ data: { item } }));
  expect(onSaved).toHaveBeenCalledWith(item);
  expect(container.querySelector('input[type="date"]').value).toBe('2026-11-20');
  expect(container.textContent).toContain('Follow-up date saved.');
  expect(axios.post).not.toHaveBeenCalled();
});

test('failed date save restores the saved value and displays the server error', async () => {
  axios.put.mockRejectedValue({ response: { data: { message: 'Could not save follow-up date.' } } });
  const onSaved = jest.fn();
  act(() => root.render(<OutreachForm lead={lead} onSaved={onSaved} />));
  await act(async () => Simulate.change(container.querySelector('input[type="date"]'), { target: { value: '2026-11-21' } }));
  expect(container.querySelector('input[type="date"]').value).toBe('2026-11-19');
  expect(container.querySelector('[role="alert"]').textContent).toContain('Could not save');
  expect(container.querySelector('fieldset').disabled).toBe(false);
  expect(onSaved).not.toHaveBeenCalled();
});

test('calendar reflects a refreshed saved date and supports clearing it', async () => {
  const onSaved = jest.fn();
  act(() => root.render(<OutreachForm lead={lead} onSaved={onSaved} />));
  act(() => root.render(<OutreachForm lead={{ ...lead, rtNextFollowupDate: '2026-11-22' }} onSaved={onSaved} />));
  expect(container.querySelector('input[type="date"]').value).toBe('2026-11-22');
  axios.put.mockResolvedValue({ data: { item: { ...lead, rtNextFollowupDate: '' } } });
  await act(async () => Simulate.change(container.querySelector('input[type="date"]'), { target: { value: '' } }));
  expect(axios.put).toHaveBeenCalledWith('/api/health-expert/leads/customer-1/followup', { nextFollowupDate: '' });
  expect(container.textContent).toContain('Follow-up date cleared.');
});
