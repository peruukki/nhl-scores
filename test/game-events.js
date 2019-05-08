import _ from 'lodash';
import {assert} from 'chai';

import gameEvents, {getGoalScoringTimes} from '../app/js/game-events';
import scoresAllRegularTime from './data/latest.json';
import scoresMultipleOvertime from './data/latest-2-ot.json';
import scoresOvertimeAndMultipleShootout from './data/latest-ot-2-so.json';
import scoresAllLive from './data/latest-live.json';
import scoresLiveProgressedMoreThanFinished from './data/latest-live-2-ot.json';
import scoresLiveEndOfOT from './data/latest-live-end-of-ot.json';
import scoresLiveEndOf2OT from './data/latest-live-end-of-2-ot.json';

const periodStartMultiplier = 150;

describe('gameEvents', () => {

  it('should include 3 periods if no games went to overtime or shootout', () => {
    const events = gameEvents(scoresAllRegularTime.games);

    // Check that regulation periods were included
    assertPeriodEndEvents(events, [1, 2, 3]);

    // Check that there were no other period end events
    assert.equal(getPeriodEndEvents(events).length, 3 * periodStartMultiplier, 'All period end events count');
  });

  it('should include events until last overtime goal if games went to overtime and none went to shootout', () => {
    const events = gameEvents(scoresMultipleOvertime.games);

    // Check that regulation periods and overtime were included
    assertPeriodEndEvents(events, [1, 2, 3, 'OT']);

    // Check the last event with time
    const lastTimeEvent = getLastNonEndEvent(events);
    assert.deepEqual(lastTimeEvent, { period: 'OT', minute: 2, second: 23 });
  });

  it('should include events until shootout if games went to shootout', () => {
    const events = gameEvents(scoresOvertimeAndMultipleShootout.games);

    // Check that regulation periods, overtime and shootout were included
    assertPeriodEndEvents(events, [1, 2, 3, 'OT', 'SO']);

    const lastClockElement = getLastNonEndEvent(events);
    assert.deepEqual(lastClockElement, { period: 'SO' });
  });

  it('should include events until most progressed game if no games have finished', () => {
    const events = gameEvents(scoresAllLive.games);

    // Check that expected regulation periods were included
    assertPeriodEndEvents(events, [1, 2]);

    // Check the last event with time
    const lastTimeEvent = getLastNonEndEvent(events);
    assert.deepEqual(lastTimeEvent, { period: 3, minute: 0, second: 53, tenthOfASecond: 0 });
  });

  it('should include events until most progressed game even if some games have finished', () => {
    const events = gameEvents(scoresLiveProgressedMoreThanFinished.games);

    // Check that expected regulation periods were included
    assertPeriodEndEvents(events, [1, 2, 3, 4]);

    // Check the last event with time
    const lastTimeEvent = getLastNonEndEvent(events);
    assert.deepEqual(lastTimeEvent, { period: 5, minute: 11, second: 2 });
  });

  it('should include 20 minute overtime events if game is live at the end of overtime', () => {
    const events = gameEvents(scoresLiveEndOfOT.games);

    // Check the last event
    assert.deepEqual(_.last(events), { end: true, inProgress: true });

    // Check the last event with time
    const lastTimeEvent = getLastNonEndEvent(events);
    assert.deepEqual(lastTimeEvent, { period: 4, minute: 0, second: 2 });

    // Check that the last period lasted 20 minutes
    assert.isTrue(_.some(events, { period: 4, minute: 20, second: 0 }));
  });

  it('should include 20 minute overtime events if game is live at the end of second overtime', () => {
    const events = gameEvents(scoresLiveEndOf2OT.games);

    // Check the last event
    assert.deepEqual(_.last(events), { end: true, inProgress: true });

    // Check the last event with time
    const lastTimeEvent = getLastNonEndEvent(events);
    assert.deepEqual(lastTimeEvent, { period: 5, minute: 0, second: 2 });

    // Check that the last period lasted 20 minutes
    assert.isTrue(_.some(events, { period: 5, minute: 20, second: 0 }));
  });

  it('should pause by multiplying each period end event', () => {
    const events = gameEvents(scoresOvertimeAndMultipleShootout.games);

    // Check period end event count
    assertPeriodEndEventsCount(events, [1, 2, 3, 'OT', 'SO']);
  });

  it('should have a final "end" event as the last event', () => {
    const events = gameEvents(scoresAllRegularTime.games);
    assert.deepEqual(_.last(events), { end: true });
  });

  it('should have a final "end" event with inProgress flag if no games have finished', () => {
    const events = gameEvents(scoresAllLive.games);
    assert.deepEqual(_.last(events), { end: true, inProgress: true });
  });

  it('should determine correct goal scoring times', () => {
    const goalScoringTimes = getGoalScoringTimes(scoresMultipleOvertime.games);

    const expectedGoalScoringTimes = _.flatten([
      _.dropRight(scoresMultipleOvertime.games[1].goals),
      scoresMultipleOvertime.games[0].goals,
      _.takeRight(scoresMultipleOvertime.games[1].goals)
    ]);

    assert.deepEqual(goalScoringTimes, expectedGoalScoringTimes);
  });

});

function assertPeriodEndEvents(events, periods) {
  const periodsWithEndEvent = _.chain(events)
    .filter(event => event.period && event.end)
    .map('period')
    .uniq()
    .value();
  assert.deepEqual(periodsWithEndEvent, periods, `End events exist only for period(s) ${periods}`);
}

function assertPeriodEndEventsCount(events, periods) {
  const allPeriodEndEvents = events.filter(event => event.period && event.end);
  const periodEndEvents = period => allPeriodEndEvents.filter(event => event.period === period);
  periods.forEach(period => {
    assert.equal(periodEndEvents(period).length, periodStartMultiplier, `Period ${period} end events count`);
  });
}

function getPeriodEndEvents(events) {
  return events.filter(event => event.period && event.end);
}

function getLastNonEndEvent(events) {
  return _.findLast(events, event => !event.end);
}
