import {div, span} from '@cycle/dom';
import _ from 'lodash';
import {format} from 'timeago.js';

import {hasClockPassedCurrentProgress, hasGoalBeenScored, truncatePlayerName} from './utils';
import {renderPeriodNumber, renderTime} from './game-clock';
import {renderTeamLogo} from './logos';

export default function gameScore(
  clock,
  {status, startTime, teams, goals, preGameStats = {}, currentStats = {}, goalCounts},
  gameAnimationIndex
) {
  const currentGoals = getCurrentGoals(clock, teams, goals, status);
  const latestGoal = _.last(currentGoals);
  const awayGoals = currentGoals.filter(goal => goal.team === teams.away.abbreviation);
  const homeGoals = currentGoals.filter(goal => goal.team === teams.home.abbreviation);
  const period = latestGoal ? latestGoal.period : null;
  const allGamesEnded = !!clock && !!clock.end && !clock.period;
  const showPreGameStats = !clock ||
    !hasGameStarted(status.state) ||
    (isGameInProgress(status.state) && (hasClockPassedCurrentProgress(clock, status) || allGamesEnded));
  const showAfterGameStats = hasGameFinished(status.state) && allGamesEnded;
  const updatePlayoffSeriesWins = showAfterGameStats;
  const showProgressInfo = showPreGameStats;
  const isBeforeGame = !clock || !hasGameStarted(status.state);

  const stats = showPreGameStats ? preGameStats : (showAfterGameStats ? currentStats : {});
  const playoffSeriesWins = getPlayoffSeriesWins(teams, awayGoals, homeGoals, preGameStats.playoffSeries, updatePlayoffSeriesWins);
  const modifier = hasGameStarted(status.state) ? '.game--started' : '';

  if (goalCounts) {
    goalCounts.away$.shamefullySendNext(awayGoals.length);
    goalCounts.home$.shamefullySendNext(homeGoals.length);
  }

  return div(`.game${modifier}.expand--${gameAnimationIndex}`, [
    renderScorePanel(teams, awayGoals, homeGoals, period, isBeforeGame),
    renderInfoPanel(showPreGameStats, showAfterGameStats, showProgressInfo, startTime, teams, stats, status,
      !!playoffSeriesWins, latestGoal),
    playoffSeriesWins ? renderSeriesWins(playoffSeriesWins, updatePlayoffSeriesWins) : null
  ]);
}

function getPlayoffSeriesWins(teams, awayGoals, homeGoals, playoffSeries, updatePlayoffSeriesWins) {
  if (playoffSeries) {
    return updatePlayoffSeriesWins ?
      getPlayoffSeriesWinsAfterGame(playoffSeries.wins, teams, awayGoals, homeGoals) :
      playoffSeries.wins;
  } else {
    return null;
  }
}

function getPlayoffSeriesWinsAfterGame(seriesWins, teams, awayGoals, homeGoals) {
  const updatedWinCount = (awayGoals.length > homeGoals.length) ?
    { [teams.away.abbreviation]: seriesWins[teams.away.abbreviation] + 1 } :
    { [teams.home.abbreviation]: seriesWins[teams.home.abbreviation] + 1 };
  return _.merge({}, seriesWins, updatedWinCount);
}

function getCurrentGoals(clock, teams, goals, status) {
  if (!clock || clock.start) {
    return [];
  }
  if (!clock.period || clock.period === 'SO') {
    const nonShootoutGoals = goals.filter(goal => goal.period !== 'SO');
    return (nonShootoutGoals.length === goals.length) ?
      goals :
      nonShootoutGoals.concat(getShootoutGoal(goals, teams, status));
  }

  return goals.filter(_.partial(hasGoalBeenScored, clock));
}

function getShootoutGoal(goals, teams, status) {
  if (isGameInProgress(status.state)) {
    return [];
  }

  const awayGoals = goals.filter(goal => goal.team === teams.away.abbreviation);
  const homeGoals = goals.filter(goal => goal.team === teams.home.abbreviation);
  const winnersGoals = (awayGoals.length > homeGoals.length) ? awayGoals : homeGoals;
  return _.last(winnersGoals);
}

function renderScorePanel(teams, awayGoals, homeGoals, period, isBeforeGame) {
  const scoreVisibilityClass = isBeforeGame ? '.team-panel__team-score--hidden' : '.fade-in';
  const delimiterVisibilityClass = isBeforeGame ? '' : '.fade-in';
  return div('.game__score-panel', [
    div('.team-panel.team-panel--away', [
      renderLogo(teams.away.id, 'away'),
      span('.team-panel__team-name', teams.away.abbreviation),
      span('.team-panel__team-score' + scoreVisibilityClass, [awayGoals.length])
    ]),
    div('.team-panel__delimiter' + delimiterVisibilityClass, isBeforeGame ? 'at' : renderDelimiter(period)),
    div('.team-panel.team-panel--home', [
      span('.team-panel__team-score' + scoreVisibilityClass, [homeGoals.length]),
      span('.team-panel__team-name', teams.home.abbreviation),
      renderLogo(teams.home.id, 'home')
    ])
  ]);
}

function renderLogo(teamId, modifier) {
  return span('.team-logo', [
    renderTeamLogo(teamId, `team-logo__image team-logo__image--${modifier} team-logo__image--${teamId}`)
  ]);
}

function renderDelimiter(period) {
  return (period === 'OT' || period === 'SO' || period > 3) ?
    span('.team-panel__delimiter-period', period === 'SO' ? 'SO' : 'OT') :
    '';
}

function renderInfoPanel(
  showPreGameStats, isAfterGame, showProgressInfo, startTime, teams, stats, status, isPlayoffGame, latestGoal
) {
  const showLatestGoal = !showPreGameStats && !showProgressInfo;
  const modifierClass = isPlayoffGame ? '.game__info-panel--playoff' : '';

  return div(`.game__info-panel${modifierClass}`, [
    showLatestGoal ? renderLatestGoal(latestGoal) : null,
    showProgressInfo ? div('.game-description.fade-in', renderGameStatus(status, startTime)) : null,
    showPreGameStats || isAfterGame ?
      renderGameStats(teams, showProgressInfo || isAfterGame, isAfterGame, isPlayoffGame, stats) :
      null
  ]);
}

function renderGameStats(teams, fadeIn, showAfterGameStats, isPlayoffGame, stats) {
  const winPctLabel = isPlayoffGame ? 'Win-%' : 'Point-%';
  const fadeInModifier = fadeIn ? '.fade-in': '';
  const afterGameModifier = showAfterGameStats ? '.game-stats--after-game' : '';

  return div(`.game-stats${afterGameModifier}${fadeInModifier}`, [
    renderTeamStats(teams, stats.records, winPctLabel, renderWinPercentage, renderWinPercentage),
    renderTeamStats(teams, stats.records, 'Record', renderWinPercentage, renderRecord),
    showAfterGameStats ? renderTeamStats(teams, stats.streaks, 'Streak', getStreakRating, renderStreak) : null,
    (showAfterGameStats && !isPlayoffGame) ?
      renderTeamStats(teams, stats.standings, 'PO spot pts', getPlayoffSpotRating, renderPlayoffSpot) :
      null
  ]);
}

function renderTeamStats(teams, values, label, ratingFn, renderFn) {
  const valueClassName = '.team-stats__value';
  const highlightClassNames = getHighlightClassNames(valueClassName, teams, values, ratingFn);
  return div('.team-stats', [
    span(`${valueClassName}${valueClassName}--away${highlightClassNames.away}`,
      values ? renderFn(values[teams.away.abbreviation]) : ''),
    span('.team-stats__label', values ? label : ''),
    span(`${valueClassName}${valueClassName}--home${highlightClassNames.home}`,
      values ? renderFn(values[teams.home.abbreviation]) : '')
  ]);
}

function getHighlightClassNames(baseClassName, teams, values, ratingFn) {
  if (!values) {
    return { away: '', home: '' };
  }

  const awayRating = ratingFn(values[teams.away.abbreviation]);
  const homeRating = ratingFn(values[teams.home.abbreviation]);

  if (awayRating > homeRating) {
    return { away: `${baseClassName}--highlight`, home: '' };
  } else if (homeRating > awayRating) {
    return { away: '', home: `${baseClassName}--highlight` };
  } else {
    return { away: '', home: '' };
  }
}

function getPointPercentage({ wins, losses, ot = 0 }) {
  const points = 2 * wins + ot;
  const maxPoints = 2 * (wins + losses + ot);
  return points / maxPoints;
}

function getStreakRating(streak) {
  return streak ? streak.count * getStreakMultiplier(streak.type) : 0;
}

function getStreakMultiplier(type) {
  switch (type) {
    case 'WINS':
      return 1;
    case 'LOSSES':
      return -1;
    default:
      return 0;
  }
}

function getPlayoffSpotRating({ pointsFromPlayoffSpot }) {
  return parseInt(pointsFromPlayoffSpot);
}

function renderWinPercentage(record) {
  const percentage = getPointPercentage(record);
  if (isNaN(percentage)) {
    return '-';
  }

  const sliceIndex = percentage < 1 ? 1 : 0;
  return percentage
    .toFixed(3)
    .slice(sliceIndex);
}

export const delimiter = span('.team-stats__delimiter', ['-']);

function renderRecord({ wins, losses, ot }) {
  return ot !== undefined ? [wins, delimiter, losses, delimiter, ot] : [wins, delimiter, losses];
}

function renderStreak(streak) {
  return streak ? `${streak.count} ${renderStreakType(streak)}` : '-';
}

function renderStreakType({ type }) {
  switch (type) {
    case 'WINS':
      return 'W';
    case 'LOSSES':
      return 'L';
    case 'OT':
      return 'OT L';
    default:
      return '';
  }
}

function renderPlayoffSpot({ pointsFromPlayoffSpot }) {
  return pointsFromPlayoffSpot || '';
}

function renderLatestGoal(latestGoal) {
  return div('.latest-goal', [
    div('.latest-goal__time', latestGoal ? renderLatestGoalTime(latestGoal) : ''),
    div('.latest-goal__scorer', latestGoal ? renderLatestGoalScorer(latestGoal) : ''),
    div('.latest-goal__assists', latestGoal ? renderLatestGoalAssists(latestGoal) : '')
  ]);
}

function renderSeriesWins(seriesWins, isChanged) {
  const animationClass = isChanged ? '.fade-in' : '';
  return div(`.game__series-wins${animationClass}`, getSeriesWinsDescription(seriesWins));
}

function getSeriesWinsDescription(seriesWins) {
  const teamsWithWins = _.map(seriesWins, (wins, team) => ({ team, wins }));
  const sortedByWins = _.sortBy(teamsWithWins, 'wins');
  const leading = _.last(sortedByWins);
  const trailing = _.first(sortedByWins);

  if (leading.wins === trailing.wins) {
    return [
      'Series ',
      span('.series-wins__tied', 'tied'),
      ' ',
      span('.series-wins__tied-count', String(leading.wins)),
      span('.series-wins__delimiter', '–'),
      span('.series-wins__tied-count', String(trailing.wins))
    ];
  } else {
    const seriesWinCount = 4;
    return [
      span('.series-wins__leading-team', leading.team),
      (leading.wins === seriesWinCount) ? ' wins ' : ' leads ',
      span('.series-wins__leading-count', String(leading.wins)),
      span('.series-wins__delimiter', '–'),
      span('.series-wins__trailing-count', String(trailing.wins))
    ];
  }
}

function renderGameStatus(status, startTime) {
  switch (status.state) {
    case 'LIVE':
      return renderCurrentProgress(status.progress);
    case 'PREVIEW':
      {
        const isInFuture = (new Date(startTime) - new Date()) > 0 ;
        return `Starts ${isInFuture ? format(startTime) : 'soon'}`;
      }
    default:
      return 'Finished';
  }
}

function renderCurrentProgress(progress) {
  if (!progress || !progress.currentPeriodOrdinal) {
    return 'In progress';
  } else if (progress.currentPeriodTimeRemaining.pretty === 'END') {
    return `End of ${progress.currentPeriodOrdinal}`;
  } else if (progress.currentPeriodOrdinal === 'SO') {
    return 'In shootout';
  } else {
    return `${progress.currentPeriodOrdinal} ${progress.currentPeriodTimeRemaining.pretty}`;
  }
}

function hasGameFinished(state) {
  return state === 'FINAL';
}

function hasGameStarted(state) {
  return state !== 'PREVIEW';
}

function isGameInProgress(state) {
  return state === 'LIVE';
}

export function renderLatestGoalTime(latestGoal) {
  const period = renderPeriodNumber(latestGoal.period);
  const time = renderTime({ minute: latestGoal.min, second: latestGoal.sec });
  return [
    span(`${period} ${time}`),
    span('.latest-goal__team', latestGoal.team),
    latestGoal.strength ? span('.latest-goal__strength', latestGoal.strength) : null,
    latestGoal.emptyNet ? span('.latest-goal__empty-net', 'EN') : null
  ];
}

export function renderLatestGoalScorer(latestGoal) {
  const {player, seasonTotal} = latestGoal.scorer;
  const scorer = truncatePlayerName(player);
  return seasonTotal ?
    [
      span('.latest-goal__scorer', `${scorer} `),
      span('.latest-goal__goal-count', `(${seasonTotal})`)
    ] :
    span('.latest-goal__scorer', scorer);
}

export function renderLatestGoalAssists(latestGoal) {
  if (!latestGoal.assists) {
    return '';
  }
  if (latestGoal.assists.length === 0) {
    return span('.latest-goal__assists-label', 'Unassisted');
  }
  return [
    div('.latest-goal__assists-label', 'Assists:'),
    ...latestGoal.assists.map(assist =>
      div('.latest-goal__assist', [
        span('.latest-goal__assister', `${truncatePlayerName(assist.player)} `),
        span('.latest-goal__assist-count', `(${assist.seasonTotal})`)
      ])
    )
  ];
}
