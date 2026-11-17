import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import axios from 'axios';
import OutreachForm from './HealthExpertOutreach';

jest.mock('axios', () => {
  const client = { get: jest.fn(), post: jest.fn() };
  return { create: () => client, ...client };
});
const quote = { product: { title: 'Sugar Control Coach and Blood test', variants: [{ id: 'variant', price: '1500.00', title: 'Default Title' }] }, customer: null, phone: '+919999999999', discountWithoutBloodTest: 1000 };
let root, container, saved;
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.includes(text));
const click = async node => { await act(async () => { node.click(); }); };
const input = label => [...document.querySelectorAll('input')].find(node => node.labels?.[0]?.textContent.includes(label));
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks(); axios.get.mockResolvedValue({ data: quote });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); saved = jest.fn();
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function open() {
  // Raw ReactDOM createRoot requires act; this is not Testing Library's wrapped render.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => root.render(<OutreachForm lead={{ _id: 'lead', name: 'Test Customer' }} onSaved={saved} />));
  expect(axios.get).not.toHaveBeenCalled();
  await click(button('Confirm coach purchase'));
}
test('opening coach purchase only loads a quote; no order or purchased state is sent', async () => {
  await open();
  expect(axios.get).toHaveBeenCalledWith('/api/health-expert/leads/lead/coach-checkout');
  expect(axios.post).not.toHaveBeenCalled(); expect(saved).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain('No Shopify customer found');
  expect(input('First name').value).toBe('Test');
  expect(input('Phone').readOnly).toBe(true);
  expect(input('Address')).toBeUndefined();
});
test('discount, required payment reference and confirmation create one prepaid order', async () => {
  await open(); await click(button('Continue'));
  await click(document.querySelector('input[type="checkbox"]'));
  expect(button('Create prepaid order').textContent).toContain('₹500.00');
  expect(button('Create prepaid order').disabled).toBe(true);
  await act(async () => { Simulate.change(input('Payment ID'), { target: { value: 'pay_123' } }); });
  await click([...document.querySelectorAll('input[type="checkbox"]')][1]);
  expect(button('Create prepaid order').disabled).toBe(false);
  const item = { _id: 'lead', healthExpertCoachPurchase: { confirmedAt: '2026-11-17', shopifyOrderName: '#COACH', paymentId: 'pay_123', amount: 500 } };
  axios.post.mockResolvedValue({ data: { item } });
  await click(button('Create prepaid order'));
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(axios.post).toHaveBeenCalledWith('/api/health-expert/leads/lead/coach-purchase', expect.objectContaining({ paymentId: 'pay_123', paymentMode: 'Prepaid', withoutBloodTest: true, expectedTotal: 500 }));
  expect(saved).toHaveBeenCalledWith(item);
  expect(document.body.textContent).toContain('Coach purchase confirmed — #COACH');
});
test('previously submitted checkout offers status recovery, not another purchase', async () => {
  axios.get.mockResolvedValue({ data: { recovering: true } });
  await open();
  expect(button('Check order status')).toBeDefined();
  expect(button('Create prepaid order')).toBeUndefined();
  expect(axios.post).not.toHaveBeenCalled();
});

test('generates a discounted Razorpay link above Payment ID without submitting an order', async () => {
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => '00000000-0000-4000-8000-000000000001' } });
  await open(); await click(button('Continue'));
  await click(document.querySelector('input[type="checkbox"]'));
  axios.post.mockResolvedValue({ data: { paymentLink: 'https://rzp.io/i/example', amount: 500, status: 'created' } });
  await click(button('Generate Razorpay link'));
  expect(axios.post).toHaveBeenCalledWith('/api/health-expert/leads/lead/coach-payment-link', expect.objectContaining({ withoutBloodTest: true, expectedTotal: 500 }));
  const link = input('Razorpay payment link');
  expect(link.value).toBe('https://rzp.io/i/example');
  expect(link.compareDocumentPosition(input('Payment ID')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(input('Payment ID').value).toBe('');
  expect(saved).not.toHaveBeenCalled();
  expect(button('Create prepaid order').disabled).toBe(true);
  await click(document.querySelector('input[type="checkbox"]'));
  expect(input('Razorpay payment link')).toBeUndefined();
  expect(button('Generate Razorpay link').textContent).toContain('₹1,500.00');
});
