/** @odoo-module **/

import { insert, insertAndReplace } from '@mail/model/model_field_command';
import { makeDeferred } from '@mail/utils/deferred';
import {
    afterNextRender,
    start,
    startServer,
} from '@mail/../tests/helpers/test_utils';

import { patchWithCleanup } from '@web/../tests/helpers/utils';

QUnit.module('sms', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('message_tests.js');

QUnit.test('Notification Sent', async function (assert) {
    assert.expect(9);

    const pyEnv = await startServer();
    const resPartnerId1 = pyEnv['res.partner'].create({ name: "Someone", partner_share: true });
    const mailChannelId1 = pyEnv['mail.channel'].create({});
    const mailMessageId1 = pyEnv['mail.message'].create({
        body: 'not empty',
        message_type: 'sms',
        model: 'mail.channel',
        res_id: mailChannelId1,
    });
    pyEnv['mail.notification'].create({
        mail_message_id: mailMessageId1,
        notification_status: 'sent',
        notification_type: 'sms',
        res_partner_id: resPartnerId1,
    });
    const { createThreadViewComponent, messaging } = await start();
    const threadViewer = messaging.models['ThreadViewer'].create({
        hasThreadView: true,
        qunitTest: insertAndReplace(),
        thread: insert({
            id: mailChannelId1,
            model: 'mail.channel',
        }),
    });
    await createThreadViewComponent(threadViewer.threadView);

    assert.containsOnce(
        document.body,
        '.o_Message',
        "should display a message component"
    );
    assert.containsOnce(
        document.body,
        '.o_Message_notificationIconClickable',
        "should display the notification icon container"
    );
    assert.containsOnce(
        document.body,
        '.o_Message_notificationIcon',
        "should display the notification icon"
    );
    assert.hasClass(
        document.querySelector('.o_Message_notificationIcon'),
        'fa-mobile',
        "icon should represent sms"
    );

    await afterNextRender(() => {
        document.querySelector('.o_Message_notificationIconClickable').click();
    });
    assert.containsOnce(
        document.body,
        '.o_MessageNotificationPopoverContent',
        "notification popover should be open"
    );
    assert.containsOnce(
        document.body,
        '.o_MessageNotificationPopoverContent_notificationIcon',
        "popover should have one icon"
    );
    assert.hasClass(
        document.querySelector('.o_MessageNotificationPopoverContent_notificationIcon'),
        'fa-check',
        "popover should have the sent icon"
    );
    assert.containsOnce(
        document.body,
        '.o_MessageNotificationPopoverContent_notificationPartnerName',
        "popover should have the partner name"
    );
    assert.strictEqual(
        document.querySelector('.o_MessageNotificationPopoverContent_notificationPartnerName').textContent.trim(),
        "Someone",
        "partner name should be correct"
    );
});

QUnit.test('Notification Error', async function (assert) {
    assert.expect(8);

    const openResendActionDef = makeDeferred();
    const pyEnv = await startServer();
    const resPartnerId1 = pyEnv['res.partner'].create({ name: "Someone", partner_share: true });
    const mailChannelId1 = pyEnv['mail.channel'].create({});
    const mailMessageId1 = pyEnv['mail.message'].create({
        body: 'not empty',
        message_type: 'sms',
        model: 'mail.channel',
        res_id: mailChannelId1,
    });
    pyEnv['mail.notification'].create({
        mail_message_id: mailMessageId1,
        notification_status: 'exception',
        notification_type: 'sms',
        res_partner_id: resPartnerId1,
    });
    const { createThreadViewComponent, env, messaging } = await start();
    patchWithCleanup(env.services.action, {
        doAction(action, options) {
            assert.step('do_action');
            assert.strictEqual(
                action,
                'sms.sms_resend_action',
                "action should be the one to resend sms"
            );
            assert.strictEqual(
                options.additional_context.default_mail_message_id,
                mailMessageId1,
                "action should have correct message id"
            );
            openResendActionDef.resolve();
        },
    });
    const threadViewer = messaging.models['ThreadViewer'].create({
        hasThreadView: true,
        qunitTest: insertAndReplace(),
        thread: insert({
            id: mailChannelId1,
            model: 'mail.channel',
        }),
    });
    await createThreadViewComponent(threadViewer.threadView);

    assert.containsOnce(
        document.body,
        '.o_Message',
        "should display a message component"
    );
    assert.containsOnce(
        document.body,
        '.o_Message_notificationIconClickable',
        "should display the notification icon container"
    );
    assert.containsOnce(
        document.body,
        '.o_Message_notificationIcon',
        "should display the notification icon"
    );
    assert.hasClass(
        document.querySelector('.o_Message_notificationIcon'),
        'fa-mobile',
        "icon should represent sms"
    );
    document.querySelector('.o_Message_notificationIconClickable').click();
    await openResendActionDef;
    assert.verifySteps(
        ['do_action'],
        "should do an action to display the resend sms dialog"
    );
});

});
});
