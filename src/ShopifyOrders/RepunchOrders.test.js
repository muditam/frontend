import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import cartReducer, { setPhoneNumber } from '../features/cart/cartSlice';
import { createRepunchStore } from './RepunchCheckout';
import CartDrawer from './CartDrawer';
import RepunchOrdersPage from './RepunchOrdersPage';

jest.mock('axios', () => {
  const client = { get: jest.fn(), post: jest.fn() };
  return { ...client, create: () => client };
});
jest.mock('react-confetti', () => () => null);
jest.mock('./OrderDetailsPopup', () => () => null);

const source = { _id: 'shiptrack:19017263939894', orderName: '#MA100', customerName: 'RTO Customer', contactNumber: '9999999999', products: [], status: 'RTO Delivered', customerAddress: { address1: 'Test Road', city: 'Delhi', province: 'Delhi', zip: '110001' } };
const history = { _id: 'MA100', status: 'completed', originalOrder: { orderName: '#MA100', customerName: 'RTO Customer', amount: 1475, products: [] }, replacementOrder: { id: 2, name: '#MA101', amount: 1, paymentMode: 'COD' }, createdBy: { name: 'Ops Agent' } };

beforeEach(() => {
  jest.clearAllMocks();
  window.matchMedia = jest.fn().mockImplementation((query) => ({ matches: false, media: query, onchange: null, addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn() }));
  axios.get.mockResolvedValue({ data: [] });
  sessionStorage.setItem('user', JSON.stringify({ fullName: 'Ops Agent' }));
});
afterEach(cleanup);

test('repunch cart is isolated and prefills the original address for review', () => {
  const normal = configureStore({ reducer: { cart: cartReducer } });
  normal.dispatch(setPhoneNumber('8888888888'));
  const repunch = createRepunchStore(source);
  expect(repunch.getState().cart.phoneNumber).toBe('9999999999');
  expect(repunch.getState().cart.newAddress.address1).toBe('Test Road');
  expect(repunch.getState().cart.addressConfirmed).toBe(false);
  repunch.dispatch(setPhoneNumber('7777777777'));
  expect(normal.getState().cart.phoneNumber).toBe('8888888888');
  expect(createRepunchStore({ ...source, contactNumber: '6666666666' }).getState().cart.cart).toEqual([]);
});

function checkoutStore() {
  const initial = cartReducer(undefined, { type: '@@INIT' });
  return configureStore({ reducer: { cart: cartReducer }, preloadedState: { cart: {
    ...initial,
    cart: [{ product: { id: 1, title: 'Test Product' }, variant: { id: 123, title: '1 Bottle', price: '1475' }, quantity: 1 }],
    appliedDiscount: 1474, paymentMethod: 'COD', phoneNumber: '9999999999', addressConfirmed: true,
    confirmedAddress: { fullName: 'RTO Customer', address1: 'Test Road', address2: '', city: 'Delhi', state: 'Delhi', pincode: '110001', country: 'India' },
  } } });
}

for (const repunch of [true, false]) {
  test(`${repunch ? 'repunch' : 'normal'} checkout uses its intended endpoint with the existing discount`, async () => {
    const onOrderCreated = jest.fn();
    axios.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/customer') ? { id: 700 } : [] }));
    axios.post.mockResolvedValue({ data: { order: { id: 2, name: '#MA101' } } });
    render(<Provider store={checkoutStore()}><CartDrawer closeDrawer={() => {}} {...(repunch ? { repunchSource: source, onOrderCreated } : {})} /></Provider>);
    fireEvent.click(screen.getByRole('button', { name: /^Payment$/i }));
    expect(screen.getByLabelText('Future date order').disabled).toBe(repunch);
    expect(screen.getByRole('button', { name: 'Create 7-day link' }).disabled).toBe(repunch);
    fireEvent.click(screen.getByRole('button', { name: repunch ? 'Repunch Order' : 'Create Order' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(axios.post.mock.calls[0][0]).toContain(repunch ? `/api/repunch-orders/${source._id}` : '/api/shopify/create-order');
    expect(axios.post.mock.calls[0][1].customerId).toBe(repunch ? 700 : '');
    expect(axios.post.mock.calls[0][1]).toMatchObject({ appliedDiscount: 1474, orderTotal: 1, paymentMode: 'COD', cartItems: [{ variantId: 123, quantity: 1 }] });
    await waitFor(() => expect(onOrderCreated).toHaveBeenCalledTimes(repunch ? 1 : 0));
  });
}

test('uncertain checkout shows the error and prevents a second submission', async () => {
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  axios.post.mockRejectedValue({ response: { status: 409, data: { message: 'Check Shopify before retrying.' } } });
  try {
    render(<Provider store={checkoutStore()}><CartDrawer repunchSource={source} closeDrawer={() => {}} /></Provider>);
    fireEvent.click(screen.getByRole('button', { name: /^Payment$/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Repunch Order' }));
    await screen.findByText('Check Shopify before retrying.');
    expect(screen.getByRole('button', { name: 'Repunch Order' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Repunch Order' }));
    expect(axios.post).toHaveBeenCalledTimes(1);
  } finally { errorLog.mockRestore(); }
});

test('RTO and repunched tabs show source/replacement links and prevent duplicate actions', async () => {
  axios.get.mockImplementation((_url, config) => Promise.resolve({ data: { total: 1, data: config?.params?.tab === 'repunched' ? [history] : [{ ...source, repunch: { status: 'completed', replacementOrder: history.replacementOrder } }] } }));
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><RepunchOrdersPage /></MemoryRouter>);
  await screen.findByText('#MA100');
  expect(screen.getByText('Repunched as #MA101')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Repunch Order' }).disabled).toBe(true);
  expect(axios.get.mock.calls[0][1].params.dateFrom).toBe('');
  fireEvent.click(screen.getByRole('tab', { name: 'Repunched Orders' }));
  await screen.findByText('#MA101');
  expect(screen.getByText('For #MA100')).toBeTruthy();
  expect(screen.getByText('Ops Agent')).toBeTruthy();
  expect(screen.getByText('₹1.00')).toBeTruthy();
});

test('prefill uses current sellable catalog prices and flags missing original variants', async () => {
  const store = createRepunchStore(source);
  const product = { id: 8, title: 'Current Product', variants: [{ id: 123, title: '1 Bottle', price: '1500', inventory_quantity: 10 }] };
  axios.get.mockResolvedValue({ data: [product] });
  render(<Provider store={store}><CartDrawer repunchSource={{ ...source, products: [{ variant_id: 123, title: 'Current Product', quantity: 2, price: 1000 }, { variant_id: 999, title: 'Unavailable Product', quantity: 1 }] }} closeDrawer={() => {}} /></Provider>);
  await screen.findByText(/Unavailable products were not added: Unavailable Product/);
  expect(store.getState().cart.cart).toHaveLength(1);
  expect(store.getState().cart.cart[0]).toMatchObject({ variant: { id: 123, price: '1500' }, quantity: 2 });
});

test('a failed list load is visible and can be retried', async () => {
  axios.get.mockRejectedValueOnce({ response: { data: { message: 'Could not load orders' } } });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><RepunchOrdersPage /></MemoryRouter>);
  await screen.findByText('Could not load orders');
  axios.get.mockResolvedValue({ data: { data: [source], total: 1 } });
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByText('#MA100');
  expect(screen.getByRole('button', { name: 'Repunch Order' }).disabled).toBe(false);
});
