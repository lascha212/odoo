/* global StripeTerminal */
odoo.define('pos_stripe.payment', function (require) {
"use strict";

const core = require('web.core');
const rpc = require('web.rpc');
const PaymentInterface = require('point_of_sale.PaymentInterface');
const { Gui } = require('point_of_sale.Gui');

const _t = core._t;

let PaymentStripe = PaymentInterface.extend({
    init: function (pos, payment_method) {
        this._super(...arguments);
        this.terminal = StripeTerminal.create({
          onFetchConnectionToken: this.stripeFetchConnectionToken.bind(this),
          onUnexpectedReaderDisconnect: this.stripeUnexpectedDisconnect.bind(this),
        });
        this.discoverReaders();
    },

    stripeUnexpectedDisconnect: function () {
      // Include a way to attempt to reconnect to a reader ?
        this._showError(_t('Reader disconnected'));
    },

    stripeFetchConnectionToken: function () {
        // Do not cache or hardcode the ConnectionToken.
        return rpc.query({
            model: 'pos.payment.method',
            method: 'stripe_connection_token',
        }, {
            silent: true,
        }).catch(function (error) {
            this._showError(_t('error'));
        }).then(function (data) {
            return data.secret;
        });
    },

    discoverReaders: async function () {
        let discoverResult = await this.terminal.discoverReaders({});
        if (discoverResult.error) {
            this._showError(_.str.sprintf(_t('Failed to discover: %s'), discoverResult.error));
        } else if (discoverResult.discoveredReaders.length === 0) {
            this._showError(_t('No available Stripe readers.'));
        } else {
            // Need to stringify all Readers to avoid to put the array into a proxy Object not interpretable
            // for the Stripe SDK
            this.pos.discoveredReaders = JSON.stringify(discoverResult.discoveredReaders);
        }
    },

    checkReader: async function () {
        let line = this.pos.get_order().selected_paymentline;
        // Because the reader can only connect to one instance of the SDK at a time.
        // We need the disconnect this reader if we want to use another one
        if (
            this.pos.connectedReader != this.payment_method.stripe_serial_number &&
            this.terminal.getConnectionStatus() == 'connected'
            ) {
            let disconnectResult = await this.terminal.disconnectReader();
            if (disconnectResult.error) {
                this._showError(disconnectResult.error.message, disconnectResult.error.code);
                line.set_payment_status('retry');
                return false;
            } else {
                return await this.connectReader();
            }
        } else if (this.terminal.getConnectionStatus() == 'not_connected') {
            return await this.connectReader();
        } else {
            return true;
        }
    },

    connectReader: async function () {
        let line = this.pos.get_order().selected_paymentline;
        let discoveredReaders = JSON.parse(this.pos.discoveredReaders);
        for (const selectedReader of discoveredReaders) {
            if (selectedReader.serial_number == this.payment_method.stripe_serial_number) {
                let connectResult = await this.terminal.connectReader(selectedReader, {fail_if_in_use: true});
                if (connectResult.error) {
                    this._showError(connectResult.error.message, connectResult.error.code);
                    line.set_payment_status('retry');
                    return false;
                } else {
                    this.pos.connectedReader = this.payment_method.stripe_serial_number;
                    return true;
                }
            }
        }
    },

    collectPayment: async function (amount) {
        let line = this.pos.get_order().selected_paymentline;
        let clientSecret = await this.fetchPaymentIntentClientSecret(line.payment_method, amount);
        line.set_payment_status('waitingCard');
        let collectPaymentMethod = await this.terminal.collectPaymentMethod(clientSecret);
        if (collectPaymentMethod.error) {
            this._showError(collectPaymentMethod.error.message, collectPaymentMethod.error.code);
            line.set_payment_status('retry');
            return false;
        } else {
            line.set_payment_status('waitingCapture');
            let processPayment = await this.terminal.processPayment(collectPaymentMethod.paymentIntent);
            if (processPayment.error) {
                this._showError(processPayment.error.message, processPayment.error.code);
                line.set_payment_status('retry');
                return false;
            } else if (processPayment.paymentIntent) {
                line.set_payment_status('waitingCapture');
                let capturePayment = await this.capturePayment(processPayment.paymentIntent.id);
                line.set_payment_status('done');
                line.transaction_id = (capturePayment.id);
                return true;
            }
        }
    },

    capturePayment: function (paymentIntentId) {
        let self = this;
        return rpc.query({
            model: 'pos.payment.method',
            method: 'stripe_capture_payment',
            args: [paymentIntentId],
        }, {
            silent: true,
        }).catch(function (error) {
            self._showError(_t('error'));
        });
    },

    fetchPaymentIntentClientSecret: function (payment_method, amount) {
        let self = this;
        return rpc.query({
            model: 'pos.payment.method',
            method: 'stripe_payment_intent',
            args: [[payment_method.id], amount],
        }, {
            silent: true,
        }).catch(function (error) {
            self._showError(_t('error'));
        }).then(function (data) {
            return data.client_secret;
        });
    },

    send_payment_request: async function (cid) {
        /**
         * Override
         */
        await this._super.apply(this, arguments);
        let line = this.pos.get_order().selected_paymentline;
        line.set_payment_status('waiting');
        if (await this.checkReader()) {
            return await this.collectPayment(line.amount);
        } else {
            return false;
        }
    },

    send_payment_cancel: async function (order, cid) {
        /**
         * Override
         */
        this._super.apply(this, arguments);
        let line = this.pos.get_order().selected_paymentline;
        let stripeCancel = await this.stripeCancel();
        if (stripeCancel) {
            line.set_payment_status('retry');
            return true;
        }
    },

    stripeCancel: async function () {
        if (this.terminal.getConnectionStatus() != 'connected') {
            this._showError(_t('Payment canceled because not reader connected'));
            return true;
        } else {
            let cancelCollectPaymentMethod = await this.terminal.cancelCollectPaymentMethod();
            if (cancelCollectPaymentMethod.error) {
                this._showError(cancelCollectPaymentMethod.error.message, cancelCollectPaymentMethod.error.code);
            }
            return true;
        }
    },

    // private methods

    _showError: function (msg, title) {
        if (!title) {
            title =  _t('Stripe Error');
        }
        Gui.showPopup('ErrorPopup',{
            'title': title,
            'body': msg,
        });
    },
});

return PaymentStripe;
});
