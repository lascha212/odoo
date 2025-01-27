/** @odoo-module **/

import { afterNextRender, start, startServer } from '@mail/../tests/helpers/test_utils';

QUnit.module('test_mail_full', {}, function () {
QUnit.module('thread_needaction_preview_tests.js');

QUnit.test('rating value displayed on the thread needaction preview', async function (assert) {
    assert.expect(4);

    const pyEnv = await startServer();
    const resPartnerId1 = pyEnv['res.partner'].create();
    const mailTestRating1 = pyEnv['mail.test.rating'].create();
    const mailMessageId1 = pyEnv['mail.message'].create({
        model: 'mail.test.rating',
        needaction: true,
        needaction_partner_ids: [pyEnv.currentPartnerId],
        res_id: mailTestRating1,
    });
    pyEnv['mail.notification'].create({
        mail_message_id: mailMessageId1,
        notification_status: 'sent',
        notification_type: 'inbox',
        res_partner_id: pyEnv.currentPartnerId,
    });
    pyEnv['rating.rating'].create([{
        consumed: true,
        message_id: mailMessageId1,
        partner_id: resPartnerId1,
        rating_image_url: "/rating/static/src/img/rating_5.png",
        rating_text: "top",
    }]);
    const { afterEvent, createMessagingMenuComponent } = await start();
    await createMessagingMenuComponent();
    await afterNextRender(() => afterEvent({
        eventName: 'o-thread-cache-loaded-messages',
        func: () => document.querySelector('.o_MessagingMenu_toggler').click(),
        message: "should wait until inbox loaded initial needaction messages",
        predicate: ({ threadCache }) => {
            return threadCache.thread.model === 'mail.box' && threadCache.thread.id === 'inbox';
        },
    }));
    assert.strictEqual(
        document.querySelector('.o_ThreadNeedactionPreview_ratingText').textContent,
        "Rating:",
        "should display the correct content (Rating:)"
    );
    assert.containsOnce(
        document.body,
        '.o_ThreadNeedactionPreview_ratingImage',
        "should have a rating image in the body"
    );
    assert.strictEqual(
        $('.o_ThreadNeedactionPreview_ratingImage').attr('data-src'),
        "/rating/static/src/img/rating_5.png",
        "should contain the correct rating image"
    );
    assert.strictEqual(
        $('.o_ThreadNeedactionPreview_ratingImage').attr('alt'),
        "top",
        "should contain the correct rating text"
    );
});

});
