/** @odoo-module **/

// ensure mail override is applied first.
import '@mail/../tests/helpers/mock_server';

import { patch } from '@web/core/utils/patch';
import { MockServer } from '@web/../tests/helpers/mock_server';

import { datetime_to_str } from 'web.time';

patch(MockServer.prototype, 'calendar', {
    //--------------------------------------------------------------------------
    // Private Mocked Methods
    //--------------------------------------------------------------------------

    /**
     * Simulates `_systray_get_calendar_event_domain` on `res.users`.
     *
     * @private
     */
    _mockResUsers_SystrayGetCalendarEventDomain() {
        const startDate = new Date();
        startDate.setUTCHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setUTCHours(23, 59, 59, 999);
        const currentPartnerAttendeeIds = this.pyEnv['calendar.attendee'].search([['partner_id', '=', this.currentPartnerId]]);
        return [
            '&',
                '|',
                    '&',
                        '|',
                            ['start', '>=', datetime_to_str(startDate)],
                            ['stop', '>=', datetime_to_str(startDate)],
                        ['start', '<=', datetime_to_str(endDate)],
                    '&',
                        ['allday', '=', true],
                        ['start_date', '=', datetime_to_str(startDate)],
                ['attendee_ids', 'in', currentPartnerAttendeeIds],
        ];
    },

    /**
     * Simulates `systray_get_activities` on `res.users`.
     *
     * @override
     */
    _mockResUsersSystrayGetActivities() {
        const activities = this._super(...arguments);
        const meetingsLines = this.pyEnv['calendar.event'].searchRead(
            this._mockResUsers_SystrayGetCalendarEventDomain(),
            {
                fields: ['id', 'start', 'name', 'allday', 'attendee_status'],
                order: 'start',
            }
        ).filter(meetingLine => meetingLine['attendee_status'] !== 'declined');
        if (meetingsLines.length) {
            activities.unshift({
                meetings: meetingsLines,
                model: 'calendar.event',
                name: 'Today\'s Meetings',
                type: 'meeting',
            });
        }
        return activities;
    },
});
