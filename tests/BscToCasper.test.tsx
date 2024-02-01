import React from 'react';

import App from '../src/App';
import { renderWithProviders } from '../utils/test-utils';

import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { setupStore } from '../src/redux/store'
import { casperSlice } from '../src/redux/casper/casperSlice';
import { walletConnectorSlice } from '../src/components/connector/wallet-connector';

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

describe('BscToCasper page tests', () => {
    it('should contain swap from casper to bsc card', () => {
        renderWithProviders(<App />);
        const bscToCasper = screen.queryAllByText(/SWAP FROM BSC TO CASPER/i);
        expect(bscToCasper.length).toBe(1)
    });

    it('should render bsc to casper input when component is mounted', () => {
        renderWithProviders(<App />);

        const bscToCasper = screen.getAllByTestId(/bsctocasper_input/i);
        expect(bscToCasper.length).toBe(2)

        userEvent.type(bscToCasper[0], '2')
    });

    it('should show connect to metamask button when not connected to ethereum', () => {
        renderWithProviders(<App />);

        const bscToCasperSubmitBtn = screen.queryAllByText(/Connect to Metamask/i);
        expect(bscToCasperSubmitBtn.length).toBe(1)
    });

     it('should render casper to bsc input when component is mounted', () => {
        renderWithProviders(<App />);

        const bscToCasper = screen.getAllByTestId(/caspertoevm_input/i);
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

    it('should show connect to metamask button when not connected to ethereum', () => {
        const ethereumProvider = jest.fn()
        //@ts-ignore
        window.CasperWalletProvider = ethereumProvider;

        renderWithProviders(<App />);

        const bscToCasperSubmitBtn = screen.queryAllByText(/Connect to Metamask/i);
        userEvent.click(bscToCasperSubmitBtn[0])

        expect(ethereumProvider).toHaveBeenCalled()
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
        expect(bscToCasperSwapBtn).toHaveLength(4)

    });

    it('should show call swap function when swap button ', () => {
        setupStore().dispatch(walletConnectorSlice.actions.walletConnected({
            userAccount: {
                'account': '0x0Bdb79846e8331A19A65430363f240Ec8aCC2A52',
                'balance': '1000',
                'chainId': '97',
                'networkClient': {}
            },
            currentWallet: '',

        }))

        const ethereumProvider = jest.fn()
        //@ts-ignore
        window.CasperWalletProvider = ethereumProvider;

        renderWithProviders(<App />);

        const bscToCasper = screen.getAllByTestId(/bsctocasper_input/i);
        expect(bscToCasper.length).toBe(2)

        userEvent.type(bscToCasper[0], '2')

        const bscToCasperSwapBtn = screen.getAllByRole('button', {
            name: /SWAP/i
          })
        expect(bscToCasperSwapBtn).toHaveLength(2)


        userEvent.click(bscToCasperSwapBtn[0])

        // ethereum provider should have been called with request
        expect(ethereumProvider).toHaveBeenCalled()
    });
});
