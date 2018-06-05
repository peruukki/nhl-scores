import _ from 'lodash';

export function remainingTimeToElapsedTime({period, minute, second}) {
  const periodLengthInMinutes = (period === 'OT') ? 5 : 20;
  const secondsRemaining = 60 * (minute || 0) + (second || 0);
  const secondsElapsed = periodLengthInMinutes * 60 - secondsRemaining;
  const elapsedMinute = Math.floor(secondsElapsed / 60);
  const elapsedSecond = secondsElapsed - 60 * elapsedMinute;

  return { period, minute: elapsedMinute, second: elapsedSecond };
}

export function elapsedTimeToRemainingTime(time) {
  return remainingTimeToElapsedTime(time);
}

export function hasGoalBeenScored(clock, goal) {
  const {period, min: minute, sec: second} = goal;
  return hasElapsedTimePassed(clock, { period, minute, second });
}

export function hasClockPassedCurrentProgress(clock, status) {
  if (!clock) {
    return false;
  }

  const progressTime = parseProgressTimeRemaining(status.progress);
  if (!progressTime) {
    return false;
  }

  const progressTimeElapsed = remainingTimeToElapsedTime(progressTime);
  return hasElapsedTimePassed(clock, progressTimeElapsed);
}

function hasElapsedTimePassed(clock, elapsedTime) {
  const {minute, second} = remainingTimeToElapsedTime(clock);
  return (getPeriodOrdinal(elapsedTime.period) < getPeriodOrdinal(clock.period)) ||
    (getPeriodOrdinal(elapsedTime.period) === getPeriodOrdinal(clock.period) &&
      (elapsedTime.minute < minute ||
        (elapsedTime.minute === minute && elapsedTime.second <= second)));
}

function parseProgressTimeRemaining(progress) {
  if (!progress) {
    return null;
  }

  if (progress.currentPeriodTimeRemaining === 'END') {
    return { period: progress.currentPeriod, minute: 0, second: 0 };
  }

  const minutesAndSecondsMatch = /(\d+)?:(\d+)/.exec(progress.currentPeriodTimeRemaining);
  if (minutesAndSecondsMatch) {
    return {
      period: progress.currentPeriod,
      minute: Number(minutesAndSecondsMatch[1] || 0),
      second: Number(minutesAndSecondsMatch[2])
    };
  }

  return null;
}

function getPeriodOrdinal(period) {
  return (period === 'OT') ? 4 : Number(period);
}

export function truncatePlayerName(name) {
  const maxLength = 20;
  if (name.length <= maxLength) {
    return name;
  } else {
    const names = name.split(' ');
    const firstNames = _.dropRight(names);
    const abbreviatedFirstNames = _.flatten(
      firstNames.map(firstName => firstName.split('-')
        .map(namePart => `${namePart[0]}.`))
    );
    return `${abbreviatedFirstNames.join('')} ${_.last(names)}`;
  }
}