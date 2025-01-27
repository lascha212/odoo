# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging
import pprint

import requests
from werkzeug.urls import url_join

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

from odoo.addons.payment_flutterwave.const import SUPPORTED_CURRENCIES


_logger = logging.getLogger(__name__)


class PaymentAcquirer(models.Model):
    _inherit = 'payment.acquirer'

    provider = fields.Selection(
        selection_add=[('flutterwave', "Flutterwave")], ondelete={'flutterwave': 'set default'}
    )
    flutterwave_public_key = fields.Char(
        string="Flutterwave Public Key",
        help="The key solely used to identify the account with Flutterwave.",
        required_if_provider='flutterwave',
    )
    flutterwave_secret_key = fields.Char(
        string="Flutterwave Secret Key",
        required_if_provider='flutterwave',
        groups='base.group_system',
    )
    flutterwave_webhook_secret = fields.Char(
        string="Flutterwave Webhook Secret",
        required_if_provider='flutterwave',
        groups='base.group_system',
    )

    #=== COMPUTE METHODS ===#

    def _compute_feature_support_fields(self):
        """ Override of `payment` to enable additional features. """
        super()._compute_feature_support_fields()
        self.filtered(lambda acq: acq.provider == 'flutterwave').update({
            'support_tokenization': True,
        })

    # === BUSINESS METHODS ===#

    @api.model
    def _get_compatible_acquirers(self, *args, currency_id=None, is_validation=False, **kwargs):
        """ Override of payment to filter out Flutterwave acquirers for unsupported currencies or
        for validation operations. """
        acquirers = super()._get_compatible_acquirers(
            *args, currency_id=currency_id, is_validation=is_validation, **kwargs
        )

        currency = self.env['res.currency'].browse(currency_id).exists()
        if (currency and currency.name not in SUPPORTED_CURRENCIES) or is_validation:
            acquirers = acquirers.filtered(lambda a: a.provider != 'flutterwave')

        return acquirers

    def _flutterwave_make_request(self, endpoint, payload=None, method='POST'):
        """ Make a request to Flutterwave API at the specified endpoint.

        Note: self.ensure_one()

        :param str endpoint: The endpoint to be reached by the request.
        :param dict payload: The payload of the request.
        :param str method: The HTTP method of the request.
        :return The JSON-formatted content of the response.
        :rtype: dict
        :raise ValidationError: If an HTTP error occurs.
        """
        self.ensure_one()

        url = url_join('https://api.flutterwave.com/v3/', endpoint)
        headers = {'Authorization': f'Bearer {self.flutterwave_secret_key}'}
        try:
            if method == 'GET':
                response = requests.get(url, params=payload, headers=headers, timeout=10)
            else:
                response = requests.post(url, json=payload, headers=headers, timeout=10)
            try:
                response.raise_for_status()
            except requests.exceptions.HTTPError:
                _logger.exception(
                    "Invalid API request at %s with data:\n%s", url, pprint.pformat(payload),
                )
                raise ValidationError("Flutterwave: " + _(
                    "The communication with the API failed. Flutterwave gave us the following "
                    "information: '%s'", response.json().get('message', '')
                ))
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
            _logger.exception("Unable to reach endpoint at %s", url)
            raise ValidationError(
                "Flutterwave: " + _("Could not establish the connection to the API.")
            )
        return response.json()

    def _get_default_payment_method_id(self):
        self.ensure_one()
        if self.provider != 'flutterwave':
            return super()._get_default_payment_method_id()
        return self.env.ref('payment_flutterwave.payment_method_flutterwave').id

    def _neutralize(self):
        super()._neutralize()
        self._neutralize_fields('flutterwave', [
            'flutterwave_public_key',
            'flutterwave_secret_key',
            'flutterwave_webhook_secret',
        ])
