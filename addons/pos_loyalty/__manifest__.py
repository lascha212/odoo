# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': "Point of Sale - Coupons & Loyalty",
    'version': '2.0',
    'category': 'Sales/Point Of Sale',
    'sequence': 6,
    'summary': 'Use Coupons, Gift Cards and Loyalty programs in Point of Sale',
    'depends': ['loyalty', 'point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'data/default_barcode_patterns.xml',
        'data/gift_card_data.xml',
        'views/loyalty_card_views.xml',
        'views/loyalty_mail_views.xml',
        'views/pos_loyalty_menu_views.xml',
        'views/res_config_settings_view.xml',
    ],
    'demo': [
        'data/pos_loyalty_demo.xml',
    ],
    'installable': True,
    'assets': {
        'point_of_sale.assets': [
            'pos_loyalty/static/src/css/Loyalty.scss',
            'pos_loyalty/static/src/js/Loyalty.js',
            'pos_loyalty/static/src/js/Orderline.js',
            'pos_loyalty/static/src/js/OrderSummary.js',
            'pos_loyalty/static/src/js/OrderWidget.js',
            'pos_loyalty/static/src/js/PaymentScreen.js',
            'pos_loyalty/static/src/js/ProductScreen.js',
            'pos_loyalty/static/src/js/ControlButtons/GiftCardButton.js',
            'pos_loyalty/static/src/js/ControlButtons/ResetProgramsButton.js',
            'pos_loyalty/static/src/js/ControlButtons/PromoCodeButton.js',
            'pos_loyalty/static/src/js/ControlButtons/RewardButton.js',
            'pos_loyalty/static/src/js/Popups/GiftCardPopup.js',
        ],
        'web.assets_tests': [
            'pos_loyalty/static/src/js/tours/**/*',
        ],
        'web.assets_qweb': [
            'pos_loyalty/static/src/xml/**/*',
        ],
    },
    'license': 'LGPL-3',
}
