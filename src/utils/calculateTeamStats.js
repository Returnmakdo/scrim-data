import { allowedIds } from "./allowedIds";

export const calculateTeamStats = (jsonData) => {
  const result = {};

  jsonData.forEach((game) => {
    const gameVersion = game.gameVersion?.split(".").slice(0, 2).join(".");
    if (!gameVersion) return;

    const memberInGame = game.participants.find((p) =>
      allowedIds.includes(p.RIOT_ID_GAME_NAME || p.riotIdGameName)
    );
    if (!memberInGame) return;

    const teamKey = memberInGame.TEAM === "100" ? "blue" : "red";

    // 🔸 버전별 초기화
    if (!result[gameVersion]) {
      result[gameVersion] = {
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
    }

    const teamStats = result[gameVersion];

    if (memberInGame.WIN === "Win") {
      teamStats[teamKey].win += 1;
    }

    teamStats[teamKey].totalGames += 1;

    game.participants
      .filter((p) => p.TEAM === memberInGame.TEAM)
      .forEach((participant) => {
        const t = teamStats[teamKey];

        t.baronKills += Number(participant.BARON_KILLS) || Number(participant.baronKills) || 0;
        t.dragonKills += Number(participant.DRAGON_KILLS) || Number(participant.dragonKills) || 0;
        t.riftHeraldKills += Number(participant.RIFT_HERALD_KILLS) || Number(participant.riftHeraldKills) || 0;
        t.missionsVoidmitessummoned +=
          Number(participant.Missions_VoidMitesSummoned) || Number(participant.missionsVoidmitessummoned) || 0;
        t.friendlyTurretLost +=
          Number(participant.FRIENDLY_TURRET_LOST) || Number(participant.friendlyTurretLost) || 0;
        t.turretsKilled += Number(participant.TURRETS_KILLED) || Number(participant.turretsKilled) || 0;
      });
  });

  // 🔸 승률 계산
  Object.keys(result).forEach((version) => {
    ["blue", "red"].forEach((team) => {
      const t = result[version][team];
      t.winRate = t.totalGames > 0 ? ((t.win / t.totalGames) * 100).toFixed(2) + "%" : "0%";
    });
  });

  return result;
};
