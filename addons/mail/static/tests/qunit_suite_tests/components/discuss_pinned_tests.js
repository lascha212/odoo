/** @odoo-module **/

import {
    afterNextRender,
    start,
    startServer,
} from '@mail/../tests/helpers/test_utils';

QUnit.module('mail', {}, function () {
QUnit.module('components', {}, function () {
QUnit.module('discuss_pinned_tests.js');

QUnit.test('sidebar: pinned channel 1: init with one pinned channel', async function (assert) {
    assert.expect(2);

    const pyEnv = await startServer();
    const mailChannelId1 = pyEnv['mail.channel'].create();
    const { messaging } = await start({
        autoOpenDiscuss: true,
    });
    assert.containsOnce(
        document.body,
        `.o_Discuss_thread[data-thread-local-id="${messaging.inbox.localId}"]`,
        "The Inbox is opened in discuss"
    );
    assert.containsOnce(
        document.body,
        `.o_DiscussSidebarCategoryItem[data-thread-local-id="${
            messaging.models['Thread'].findFromIdentifyingData({
                id: mailChannelId1,
                model: 'mail.channel',
            }).localId
        }"]`,
        "should have the only channel of which user is member in discuss sidebar"
    );
});

QUnit.test('sidebar: pinned channel 2: open pinned channel', async function (assert) {
    assert.expect(1);

    const pyEnv = await startServer();
    const mailChannelId1 = pyEnv['mail.channel'].create();
    const { click, messaging } = await start({
        autoOpenDiscuss: true,
    });

    const threadGeneral = messaging.models['Thread'].findFromIdentifyingData({
        id: mailChannelId1,
        model: 'mail.channel',
    });
    await click(`.o_DiscussSidebarCategoryItem[data-thread-local-id="${
        threadGeneral.localId
    }"]`);
    assert.containsOnce(
        document.body,
        `.o_Discuss_thread[data-thread-local-id="${threadGeneral.localId}"]`,
        "The channel #General is displayed in discuss"
    );
});

QUnit.test('sidebar: pinned channel 3: open channel and leave it', async function (assert) {
    assert.expect(6);

    const pyEnv = await startServer();
    const mailChannelId1 = pyEnv['mail.channel'].create({
        channel_last_seen_partner_ids: [[0, 0, {
            fold_state: 'open',
            is_minimized: true,
            partner_id: pyEnv.currentPartnerId,
        }]],
    });
    const { click, messaging } = await start({
        autoOpenDiscuss: true,
        async mockRPC(route, args) {
            if (args.method === 'action_unfollow') {
                assert.step('action_unfollow');
                assert.deepEqual(args.args[0], [mailChannelId1],
                    "The right id is sent to the server to remove"
                );
            }
        },
    });

    const threadGeneral = messaging.models['Thread'].findFromIdentifyingData({
        id: mailChannelId1,
        model: 'mail.channel',
    });
    await click(`.o_DiscussSidebarCategoryItem[data-thread-local-id="${
        threadGeneral.localId
    }"]`);
    assert.verifySteps([], "action_unfollow is not called yet");

    await click('.o_DiscussSidebarCategoryItem_commandLeave');
    assert.verifySteps(
        [
            'action_unfollow'
        ],
        "action_unfollow has been called when leaving a channel"
    );
    assert.containsNone(
        document.body,
        `.o_DiscussSidebarCategoryItem[data-thread-local-id="${threadGeneral.localId}"]`,
        "The channel must have been removed from discuss sidebar"
    );
    assert.containsOnce(
        document.body,
        '.o_Discuss_noThread',
        "should have no thread opened in discuss"
    );
});

QUnit.test('sidebar: unpin channel from bus', async function (assert) {
    assert.expect(5);

    const pyEnv = await startServer();
    const mailChannelId1 = pyEnv['mail.channel'].create();
    const { click, messaging } = await start({
        autoOpenDiscuss: true,
    });
    const threadGeneral = messaging.models['Thread'].findFromIdentifyingData({
        id: mailChannelId1,
        model: 'mail.channel',
    });

    assert.containsOnce(
        document.body,
        `.o_Discuss_thread[data-thread-local-id="${messaging.inbox.localId}"]`,
        "The Inbox is opened in discuss"
    );
    assert.containsOnce(
        document.body,
        `.o_DiscussSidebarCategoryItem[data-thread-local-id="${threadGeneral.localId}"]`,
        "1 channel is present in discuss sidebar and it is 'general'"
    );

    await click(`.o_DiscussSidebarCategoryItem[data-thread-local-id="${
        threadGeneral.localId
    }"]`);
    assert.containsOnce(
        document.body,
        `.o_Discuss_thread[data-thread-local-id="${threadGeneral.localId}"]`,
        "The channel #General is opened in discuss"
    );

    // Simulate receiving a leave channel notification
    // (e.g. from user interaction from another device or browser tab)
    await afterNextRender(() => {
        pyEnv['bus.bus']._sendone(pyEnv.currentPartner, 'mail.channel/unpin', {
            'channel_type': 'channel',
            'id': mailChannelId1,
            'name': "General",
            'public': 'public',
            'state': 'open',
        });
    });
    assert.containsOnce(
        document.body,
        '.o_Discuss_noThread',
        "should have no thread opened in discuss"
    );
    assert.containsNone(
        document.body,
        `.o_DiscussSidebarCategoryItem[data-thread-local-id="${threadGeneral.localId}"]`,
        "The channel must have been removed from discuss sidebar"
    );
});

QUnit.test('[technical] sidebar: channel group_based_subscription: mandatorily pinned', async function (assert) {
    assert.expect(2);

    // FIXME: The following is admittedly odd.
    // Fixing it should entail a deeper reflexion on the group_based_subscription
    // and is_pinned functionalities, especially in python.
    // task-2284357

    const pyEnv = await startServer();
    const mailChannelId1 = pyEnv['mail.channel'].create({
        channel_last_seen_partner_ids: [[0, 0, {
            is_pinned: false,
            partner_id: pyEnv.currentPartnerId,
        }]],
        group_based_subscription: true,
    });
    const { messaging } = await start({
        autoOpenDiscuss: true,
    });
    const threadGeneral = messaging.models['Thread'].findFromIdentifyingData({
        id: mailChannelId1,
        model: 'mail.channel',
    });
    assert.containsOnce(
        document.body,
        `.o_DiscussSidebarCategoryItem[data-thread-local-id="${threadGeneral.localId}"]`,
        "The channel #General is in discuss sidebar"
    );
    assert.containsNone(
        document.body,
        'o_DiscussSidebarCategoryItem_commandLeave',
        "The group_based_subscription channel is not unpinnable"
    );
});

});
});
