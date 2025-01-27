{
    'name' : 'IM Bus',
    'version': '1.0',
    'category': 'Hidden',
    'description': "Instant Messaging Bus allow you to send messages to users, in live.",
    'depends': ['base', 'web'],
    'data': [
        'security/ir.model.access.csv',
    ],
    'installable': True,
    'assets': {
        'web.assets_backend': [
            'bus/static/src/**/*',
        ],
        'web.assets_frontend': [
            'bus/static/src/js/longpolling_bus.js',
            'bus/static/src/js/crosstab_bus.js',
            'bus/static/src/js/services/bus_service.js',
            'bus/static/src/js/services/legacy/*.js',
            'bus/static/src/js/*.js',
        ],
        'web.qunit_suite_tests': [
            'bus/static/tests/*.js',
        ],
    },
    'license': 'LGPL-3',
}
