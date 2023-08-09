import React from 'react';

import App from '../src/App';
import { renderWithProviders } from '../utils/test-utils';

import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { setupStore } from '../src/redux/store'
import { casperSlice } from '../src/redux/casper/casperSlice';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: jest.fn().mockReturnValue({ environment: 'dev', service: 'fakeService' }),
}))

const casperProvider = jest.fn().mockReturnValue({ isConnected: jest.fn() });

Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    }))
});

//@ts-ignore
window.CasperWalletProvider = casperProvider;
  
describe('Swap page tests', () => {
    it('should contain swap from bsc to casper card', () => {
        renderWithProviders(<App />);
        const casperToBsc = screen.queryAllByText(/SWAP FROM CASPER TO BSC/i);
        expect(casperToBsc.length).toBe(1)
    });

    it('should render bsc to casper input when component is mounted', () => {
        renderWithProviders(<App />);

        const bscToCasper = screen.getAllByTestId(/caspertobsc_input/i);
        expect(bscToCasper.length).toBe(2)

        userEvent.type(bscToCasper[0], '2')
    });

     it('should render casper to bsc input when component is mounted', () => {
        renderWithProviders(<App />);

        const bscToCasper = screen.getAllByTestId(/caspertobsc_input/i);
        expect(bscToCasper.length).toBe(2)

        userEvent.type(bscToCasper[0], '1')
    });

    it('should show connect to casper signer button when not connected to casper network', () => {
        renderWithProviders(<App />);

        const bscToCasperSubmitBtn = screen.queryAllByText(/Connect Casper Signer/i);
        expect(bscToCasperSubmitBtn.length).toBe(1)
    });

    it('should call casper provider when connect is clicked', () => {
        renderWithProviders(<App />);

        const bscToCasperSubmitBtn = screen.queryAllByText(/Connect Casper Signer/i);
        userEvent.click(bscToCasperSubmitBtn[0])

        expect(casperProvider).toHaveBeenCalled()
    });


    it('should show swap button when wallet is connected', () => {
        setupStore().dispatch(casperSlice.actions.connectWallet({}))

        const ethereumProvider = jest.fn()
        //@ts-ignore
        window.CasperWalletProvider = ethereumProvider;

        renderWithProviders(<App />);

        const bscToCasperSubmitBtn = screen.queryAllByText(/Connect Casper Signer/i);
        expect(bscToCasperSubmitBtn).toHaveLength(0)

        const bscToCasperSwapBtn = screen.queryAllByText(/SWAP/i);
        expect(bscToCasperSwapBtn).toHaveLength(5)

    });

    it('should show call swap function when swap button ', () => {
        setupStore().dispatch(casperSlice.actions.connectWallet({
            connectedAccounts: ['02031161d6bbcdac68448b8458c6d9e367606fe8063e258fa555c5575fd8e0454c62']
        }))

        const ethereumProvider = jest.fn()
        //@ts-ignore
        window.CasperWalletProvider = ethereumProvider;

        renderWithProviders(<App />);

        const bscToCasper = screen.getAllByTestId(/caspertobsc_input/i);
        expect(bscToCasper.length).toBe(2)

        userEvent.type(bscToCasper[0], '2')

        const bscToCasperSwapBtn = screen.getAllByRole('button', {
            name: /SWAP/i
          })
        expect(bscToCasperSwapBtn).toHaveLength(1)


        userEvent.click(bscToCasperSwapBtn[0])

        // casper provider should have been called with request
        expect(casperProvider).toHaveBeenCalled()
    });
});