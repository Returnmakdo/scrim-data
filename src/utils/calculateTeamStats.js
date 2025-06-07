import { allowedIds } from "./allowedIds";


export const calculateTeamStats = (jsonData) => {
  const teamStats = {
    blue: {
      baronKills: 0,
      dragonKills: 0,
      riftHeraldKills: 0,
      missionsVoidmitessummoned: 0,
      friendlyTurretLost: 0,
      turretsKilled: 0,
      win: 0,
      totalGames: 0,
    },
    red: {
      baronKills: 0,
      dragonKills: 0,
      riftHeraldKills: 0,
      missionsVoidmitessummoned: 0,
      friendlyTurretLost: 0,
      turretsKilled: 0,
      win: 0,
      totalGames: 0,
    },
  };

  jsonData.forEach((game) => {
    const firstParticipant = game.participants[0];
    const team = firstParticipant.TEAM === "100" ? "blue" : "red"; // 팀 구분
    const isWin = firstParticipant.WIN === "Win"; // 승리 여부
    teamStats["version"] = game.gameVersion.split(".").slice(0, 2).join("."); // 게임 버전 추가

    // 승리 여부와 총 게임 수 누적
    if (isWin) {
      teamStats[team].win += 1;
    }
    teamStats[team].totalGames += 1;
    game.participants.forEach((participant) => {
      const team = participant.TEAM === "100" ? "blue" : "red"; // 팀 구분
      // 각 지표 누적
      teamStats[team].baronKills += Number(participant.BARON_KILLS) || Number(participant.baronKills) || 0;
      teamStats[team].dragonKills += Number(participant.DRAGON_KILLS) || Number(participant.dragonKills) || 0;
      teamStats[team].riftHeraldKills += Number(participant.RIFT_HERALD_KILLS) || Number(participant.riftHeraldKills) || 0;
      teamStats[team].missionsVoidmitessummoned += Number(participant.Missions_VoidMitesSummoned) || Number(participant.missionsVoidmitessummoned) || 0;
      teamStats[team].friendlyTurretLost += Number(participant.FRIENDLY_TURRET_LOST) || Number(participant.friendlyTurretLost) || 0;
      teamStats[team].turretsKilled += Number(participant.TURRETS_KILLED) || Number(participant.turretsKilled) || 0;
    });
  });
  // 승률 계산
  Object.keys(teamStats)
    .filter((team) => team === "blue" || team === "red") // blue와 red만 필터링
    .forEach((team) => {
      const stats = teamStats[team];
      stats.winRate = stats.totalGames ? (stats.win / stats.totalGames) * 100 + "%" : "0" + "%"; // 승률 계산
    });

  return teamStats;
};
