import { div, span, VNode } from '@cycle/dom';
import { assert } from 'chai';
import _ from 'lodash';

import Game from 'app/js/components/game';
import {
  GAME_DISPLAY_IN_PROGRESS,
  GAME_DISPLAY_PLAYBACK,
  GAME_DISPLAY_POST_GAME_FINISHED,
  GAME_DISPLAY_PRE_GAME,
} from 'app/js/events/constants';
import type {
  Game as GameT,
  GameStatus,
  Goal,
  TeamAbbreviation,
  Teams,
  TeamStats,
} from 'app/js/types';

import scoresAllRegularTime from '../data/latest.json';
import scoresAllRegularTimePlayoffs from '../data/latest-playoffs.json';
import scoresRegularTimeAndOvertimePlayoffs from '../data/latest-playoffs-ot.json';
import { getGameCard } from './test-utils';

describe('playoff series wins panel', () => {
  it('should not exist if there is no playoff series information', () => {
    const { teams, goals, preGameStats } = scoresAllRegularTime.games[1];
    assertPlayoffSeriesWins(
      GAME_DISPLAY_PLAYBACK,
      teams,
      goals,
      preGameStats as unknown as TeamStats,
      'FINAL',
      undefined,
      null,
    );
  });

  it('should show "<Round> - Game 1" for first game of the series', () => {
    const { teams, goals, preGameStats } = scoresAllRegularTimePlayoffs.games[2];
    assertPlayoffSeriesWins(
      GAME_DISPLAY_PLAYBACK,
      teams,
      goals,
      preGameStats as unknown as TeamStats,
      'FINAL',
      undefined,
      '1st round - Game 1',
    );
  });

  it('should show the series tied when teams have the same amount of wins', () => {
    const { teams, goals, preGameStats } = scoresAllRegularTimePlayoffs.games[0];
    assertPlayoffSeriesTied(
      GAME_DISPLAY_PLAYBACK,
      teams,
      goals,
      preGameStats as unknown as TeamStats,
      'FINAL',
      1,
    );
  });

  it('should show the team that has more wins leading the series', () => {
    const { teams, goals, preGameStats } = scoresAllRegularTimePlayoffs.games[1];
    assertPlayoffSeriesLead(
      GAME_DISPLAY_PLAYBACK,
      teams,
      goals,
      preGameStats as unknown as TeamStats,
      'FINAL',
      'NYR',
      2,
      1,
    );
  });

  it('should show the team that has reached 3 wins winning the series in round 0', () => {
    const { teams, goals, preGameStats } = scoresAllRegularTimePlayoffs.games[1];
    const modifiedPreGameStats = _.cloneDeep(preGameStats);
    modifiedPreGameStats.playoffSeries.round = 0;
    modifiedPreGameStats.playoffSeries.wins.NYR = 3;
    assertPlayoffSeriesLead(
      GAME_DISPLAY_PLAYBACK,
      teams,
      goals,
      modifiedPreGameStats as unknown as TeamStats,
      'FINAL',
      'NYR',
      3,
      1,
      undefined,
      'wins',
    );
  });

  it('should show the team that has reached 4 wins winning the series in round 1', () => {
    const { teams, goals, preGameStats } = scoresAllRegularTimePlayoffs.games[1];
    const modifiedPreGameStats = _.cloneDeep(preGameStats);
    modifiedPreGameStats.playoffSeries.round = 1;
    modifiedPreGameStats.playoffSeries.wins.NYR = 4;
    assertPlayoffSeriesLead(
      GAME_DISPLAY_PLAYBACK,
      teams,
      goals,
      modifiedPreGameStats as unknown as TeamStats,
      'FINAL',
      'NYR',
      4,
      1,
      undefined,
      'wins',
    );
  });

  it("should not increase the winning teams' win counts until all games have ended", () => {
    const gameDisplay = GAME_DISPLAY_PLAYBACK;
    const game1 = scoresRegularTimeAndOvertimePlayoffs.games[0];
    assertPlayoffSeriesTied(
      gameDisplay,
      game1.teams,
      game1.goals,
      game1.preGameStats as unknown as TeamStats,
      'FINAL',
      1,
    );

    const game2 = scoresRegularTimeAndOvertimePlayoffs.games[1];
    assertPlayoffSeriesLead(
      gameDisplay,
      game2.teams,
      game2.goals,
      game2.preGameStats as unknown as TeamStats,
      'FINAL',
      'ANA',
      2,
      1,
    );
  });

  it('should not increase win counts for "not started" or "in progress" games after all finished games have ended', () => {
    const game1 = scoresRegularTimeAndOvertimePlayoffs.games[0];
    assertPlayoffSeriesTied(
      GAME_DISPLAY_IN_PROGRESS,
      game1.teams,
      game1.goals,
      game1.preGameStats as unknown as TeamStats,
      'LIVE',
      1,
    );

    const game2 = scoresRegularTimeAndOvertimePlayoffs.games[1];
    assertPlayoffSeriesLead(
      GAME_DISPLAY_PRE_GAME,
      game2.teams,
      game2.goals,
      game2.preGameStats as unknown as TeamStats,
      'PREVIEW',
      'ANA',
      2,
      1,
    );
  });

  it("should increase the winning teams' win counts after all games have ended", () => {
    const gameDisplay = GAME_DISPLAY_POST_GAME_FINISHED;
    const game1 = scoresRegularTimeAndOvertimePlayoffs.games[0];
    assertPlayoffSeriesLead(
      gameDisplay,
      game1.teams,
      game1.goals,
      game1.preGameStats as unknown as TeamStats,
      'FINAL',
      'STL',
      2,
      1,
      '.fade-in',
    );

    const game2 = scoresRegularTimeAndOvertimePlayoffs.games[1];
    assertPlayoffSeriesTied(
      gameDisplay,
      game2.teams,
      game2.goals,
      game2.preGameStats as unknown as TeamStats,
      'FINAL',
      2,
      '.fade-in',
    );
  });
});

function assertPlayoffSeriesLead(
  gameDisplay: string,
  teams: Teams,
  goals: Goal[],
  preGameStats: TeamStats,
  state: GameStatus['state'],
  leadingTeam: TeamAbbreviation,
  leadingWins: number,
  trailingWins: number,
  animationClass?: string,
  leadingText = 'leads',
) {
  return assertPlayoffSeriesWins(gameDisplay, teams, goals, preGameStats, state, animationClass, [
    span('.series-wins__leading-team', leadingTeam),
    ` ${leadingText} `,
    span('.series-wins__leading-count', String(leadingWins)),
    span('.series-wins__delimiter', '-'),
    span('.series-wins__trailing-count', String(trailingWins)),
  ]);
}

function assertPlayoffSeriesTied(
  gameDisplay: string,
  teams: Teams,
  goals: Goal[],
  preGameStats: TeamStats,
  state: GameStatus['state'],
  wins: number,
  animationClass?: string,
) {
  return assertPlayoffSeriesWins(gameDisplay, teams, goals, preGameStats, state, animationClass, [
    'Series ',
    span('.series-wins__tied', 'tied'),
    ' ',
    span('.series-wins__tied-count', String(wins)),
    span('.series-wins__delimiter', '-'),
    span('.series-wins__tied-count', String(wins)),
  ]);
}

function assertPlayoffSeriesWins(
  gameDisplay: string,
  teams: Teams,
  goals: Goal[],
  preGameStats: TeamStats,
  state: GameStatus['state'],
  animationClass: string | undefined,
  expectedSeriesWinsVtree: (VNode | string)[] | string | null,
) {
  const playoffSeriesWinsPanel = getPlayoffSeriesWinsPanel(
    Game(gameDisplay, { status: { state }, teams, preGameStats } as GameT, goals, 0),
  );
  const expected = expectedPlayoffSeriesWinsPanel(expectedSeriesWinsVtree, animationClass);
  assert.deepEqual(playoffSeriesWinsPanel, expected);
}

function getPlayoffSeriesWinsPanel(vtree: VNode) {
  return getGameCard(vtree)?.children?.[2];
}

function expectedPlayoffSeriesWinsPanel(
  seriesWinsVtree: (VNode | string)[] | string | null,
  animationClass: string | undefined,
) {
  return seriesWinsVtree
    ? div(`.game__series-wins${animationClass || ''}`, seriesWinsVtree)
    : seriesWinsVtree;
}
