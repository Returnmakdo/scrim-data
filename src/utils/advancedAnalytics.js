import { championNameMap } from './championNameMap.js';

// 고급 분석 지표 계산 함수들

// KDA 계산
export const calculateKDA = (kills, deaths, assists) => {
  if (deaths === 0) return kills + assists; // Perfect KDA
  return ((kills + assists) / deaths).toFixed(2);
};

// 킬 관여율 계산 (팀 총 킬 필요)
export const calculateKillParticipation = (kills, assists, teamTotalKills) => {
  if (teamTotalKills === 0) return 0;
  return (((kills + assists) / teamTotalKills) * 100).toFixed(1);
};

// 데미지 효율성
export const calculateDamageEfficiency = (damageDealt, damageTaken) => {
  if (damageTaken === 0) return damageDealt > 0 ? 999 : 0;
  return (damageDealt / damageTaken).toFixed(2);
};

// 골드 효율성
export const calculateGoldEfficiency = (damageDealt, goldEarned) => {
  if (goldEarned === 0) return 0;
  return (damageDealt / goldEarned).toFixed(2);
};

// 실제 게임 시간을 사용한 CS/분 계산
export const calculateCSPerMinute = (cs, gameTimeInSeconds) => {
  const minutes = gameTimeInSeconds / 60;
  if (minutes === 0) return 0;
  return (cs / minutes).toFixed(1);
};

// 시야 기여도
export const calculateVisionContribution = (wardsPlaced, wardsKilled, visionScore) => {
  if (visionScore === 0) return 0;
  return (((wardsPlaced + wardsKilled) / visionScore) * 100).toFixed(1);
};

// 정글러 효율성 계산
export const calculateJunglerEfficiency = (participant) => {
  const ownJungle = Number(participant.NEUTRAL_MINIONS_KILLED_YOUR_JUNGLE || 0);
  const enemyJungle = Number(participant.NEUTRAL_MINIONS_KILLED_ENEMY_JUNGLE || 0);
  const totalJungle = Number(participant.NEUTRAL_MINIONS_KILLED || 0);
  const gameTime = Number(participant.TIME_PLAYED || 1800); // 기본값 30분
  
  return {
    jungleCSPerMinute: ((totalJungle / (gameTime / 60)).toFixed(1)),
    counterJungleRate: totalJungle > 0 ? ((enemyJungle / totalJungle) * 100).toFixed(1) : 0,
    jungleInvasionSuccess: enemyJungle > 0 ? "성공" : "없음",
    ownJungleControl: ownJungle > 0 ? ((ownJungle / totalJungle) * 100).toFixed(1) : 0
  };
};

// 포지션 감지 함수
export const getPlayerPosition = (participant) => {
  const position = participant.INDIVIDUAL_POSITION || participant.TEAM_POSITION || "UNKNOWN";
  // UTILITY를 SUPPORT로 변경
  return position === "UTILITY" ? "SUPPORT" : position;
};

// 챔피언 이름 가져오기 (한글)
export const getChampionName = (participant) => {
  const englishName = participant.SKIN || participant.CHAMPION_NAME || "Unknown";
  return championNameMap[englishName] || englishName;
};

// 고급 분석 지표를 모두 계산하는 함수
export const calculateAdvancedMetrics = (participant, teamData = null, gameParticipants = null) => {
  const kills = Number(participant.CHAMPIONS_KILLED || 0);
  const deaths = Number(participant.NUM_DEATHS || 0);
  const assists = Number(participant.ASSISTS || 0);
  const damageDealt = Number(participant.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS || 0);
  const damageTaken = Number(participant.TOTAL_DAMAGE_TAKEN || 0);
  const goldEarned = Number(participant.GOLD_EARNED || 0);
  const cs = Number(participant.Missions_CreepScore || 0);
  const visionScore = Number(participant.VISION_SCORE || 0);
  const wardsPlaced = Number(participant.WARD_PLACED || 0);
  const wardsKilled = Number(participant.WARD_KILLED || 0);
  const gameTime = Number(participant.TIME_PLAYED || 1800); // 실제 게임 시간 사용
  const position = getPlayerPosition(participant);

  // 킬 관여율 계산 - teamData가 없으면 실제 데이터에서 계산
  let killParticipation = 0;
  if (teamData && teamData.totalKills > 0) {
    killParticipation = calculateKillParticipation(kills, assists, teamData.totalKills);
  } else if (gameParticipants) {
    // 해당 게임의 같은 팀 플레이어들만 사용
    const sameGameTeammates = gameParticipants.filter(p => p.TEAM === participant.TEAM);
    const actualTeamKillsAndAssists = calculateActualTeamKillsAndAssists(sameGameTeammates, participant.TEAM);
    killParticipation = calculateKillParticipation(kills, assists, actualTeamKillsAndAssists);
  } else {
    // 팀 데이터가 없을 때는 추정값 사용
    const estimatedTeamKillsAndAssists = 36;
    killParticipation = calculateKillParticipation(kills, assists, estimatedTeamKillsAndAssists);
  }

  const baseMetrics = {
    kda: calculateKDA(kills, deaths, assists),
    killParticipation: killParticipation,
    earlyKillParticipation: calculateEarlyKillParticipation(participant, gameParticipants),
    damageEfficiency: calculateDamageEfficiency(damageDealt, damageTaken),
    goldEfficiency: calculateGoldEfficiency(damageDealt, goldEarned),
    csPerMinute: calculateCSPerMinute(cs, gameTime),
    visionContribution: calculateVisionContribution(wardsPlaced, wardsKilled, visionScore),
    position: position,
    champion: getChampionName(participant)
  };

  // 포지션별 특수 지표 추가
  if (position === "JUNGLE") {
    const junglerMetrics = calculateJunglerSpecialMetrics(participant, gameParticipants);
    baseMetrics.jungleCSPerMinute = junglerMetrics.jungleCSPerMinute;
    baseMetrics.counterJungleRate = junglerMetrics.counterJungleRate;
    baseMetrics.ownJungleControl = junglerMetrics.ownJungleControl;
    baseMetrics.jungleInvasionSuccess = junglerMetrics.jungleInvasionSuccess;
  } else if (position === "SUPPORT") {
    const supportMetrics = calculateSupportSpecialMetrics(participant, gameParticipants);
    baseMetrics.wardsPlaced = supportMetrics.wardsPlaced;
    baseMetrics.wardsKilled = supportMetrics.wardsKilled;
  }

  return baseMetrics;
};

// 포지션별 플레이어 그룹화
export const groupPlayersByPosition = (participants) => {
  const positions = {};
  
  participants.forEach(participant => {
    const position = getPlayerPosition(participant);
    if (!positions[position]) {
      positions[position] = [];
    }
    positions[position].push(participant);
  });
  
  return positions;
};

// 15분 이전 실제 팀 킬 수 계산
export const calculateActualEarlyTeamKills = (allParticipants, targetPlayerTeam) => {
  // 같은 팀 플레이어들의 15분 이전 킬 수 합계
  const teamPlayers = allParticipants.filter(p => p.TEAM === targetPlayerTeam);
  const totalEarlyKills = teamPlayers.reduce((sum, p) => 
    sum + Number(p.Missions_TakedownsBefore15Min || 0), 0);
  
  return totalEarlyKills || 8; // 데이터가 없으면 기본값 8
};

// 15분 이전 킬관여율 계산 (실제 데이터 사용)
export const calculateEarlyKillParticipation = (participant, allParticipants = null) => {
  const takedownsBefore15Min = Number(participant.Missions_TakedownsBefore15Min || 0);
  
  let teamEarlyKills = 8; // 기본값
  if (allParticipants) {
    teamEarlyKills = calculateActualEarlyTeamKills(allParticipants, participant.TEAM);
  }
  
  if (teamEarlyKills === 0) return 0;
  return ((takedownsBefore15Min / teamEarlyKills) * 100).toFixed(1);
};

// 실제 팀 킬+어시스트 총합 계산
export const calculateActualTeamKillsAndAssists = (allParticipants, targetPlayerTeam) => {
  const teamPlayers = allParticipants.filter(p => p.TEAM === targetPlayerTeam);
  const totalKillsAndAssists = teamPlayers.reduce((sum, p) => 
    sum + Number(p.CHAMPIONS_KILLED || 0) + Number(p.ASSISTS || 0), 0);
  
  return totalKillsAndAssists || 36; // 데이터가 없으면 기본값 36 (킬18+어시18)
};

// 실제 팀 킬 수 계산
export const calculateActualTeamKills = (allParticipants, targetPlayerTeam) => {
  const teamPlayers = allParticipants.filter(p => p.TEAM === targetPlayerTeam);
  const totalKills = teamPlayers.reduce((sum, p) => 
    sum + Number(p.CHAMPIONS_KILLED || 0), 0);
  
  return totalKills || 18; // 데이터가 없으면 기본값 18
};

// 정글러 전용 지표 계산 (실제 데이터 사용)
export const calculateJunglerSpecialMetrics = (participant, allParticipants = null) => {
  const ownJungle = Number(participant.NEUTRAL_MINIONS_KILLED_YOUR_JUNGLE || 0);
  const enemyJungle = Number(participant.NEUTRAL_MINIONS_KILLED_ENEMY_JUNGLE || 0);
  const totalJungle = Number(participant.NEUTRAL_MINIONS_KILLED || 0);
  const gameTime = Number(participant.TIME_PLAYED || 1800);
  const kills = Number(participant.CHAMPIONS_KILLED || 0);
  const deaths = Number(participant.NUM_DEATHS || 0);
  const assists = Number(participant.ASSISTS || 0);
  
  let teamKillsAndAssists = 36; // 기본값
  if (allParticipants) {
    teamKillsAndAssists = calculateActualTeamKillsAndAssists(allParticipants, participant.TEAM);
  }
  
  return {
    jungleCSPerMinute: ((totalJungle / (gameTime / 60)).toFixed(1)),
    counterJungleRate: totalJungle > 0 ? ((enemyJungle / totalJungle) * 100).toFixed(1) : "0.0", // 카정 비율
    ownJungleControl: totalJungle > 0 ? ((ownJungle / totalJungle) * 100).toFixed(1) : "0.0", // 풀캠 비율
    jungleInvasionSuccess: enemyJungle > 0 ? "성공" : "없음",
    kda: calculateKDA(kills, deaths, assists),
    earlyKillParticipation: calculateEarlyKillParticipation(participant, allParticipants),
    killParticipation: calculateKillParticipation(kills, assists, teamKillsAndAssists)
  };
};

// 서포터 전용 지표 계산 (실제 데이터 사용)
export const calculateSupportSpecialMetrics = (participant, allParticipants = null) => {
  const wardsPlaced = Number(participant.WARD_PLACED || 0);
  const wardsKilled = Number(participant.WARD_KILLED || 0);
  const kills = Number(participant.CHAMPIONS_KILLED || 0);
  const deaths = Number(participant.NUM_DEATHS || 0);
  const assists = Number(participant.ASSISTS || 0);
  
  let teamKillsAndAssists = 36; // 기본값
  if (allParticipants) {
    teamKillsAndAssists = calculateActualTeamKillsAndAssists(allParticipants, participant.TEAM);
  }
  
  return {
    wardsPlaced: wardsPlaced,
    wardsKilled: wardsKilled,
    kda: calculateKDA(kills, deaths, assists),
    earlyKillParticipation: calculateEarlyKillParticipation(participant, allParticipants),
    killParticipation: calculateKillParticipation(kills, assists, teamKillsAndAssists)
  };
};

// 포지션별 평균 계산 (개선된 버전)
export const calculatePositionAverages = (players, allGamesData = null) => {
  if (players.length === 0) return null;
  
  // 각 플레이어별로 해당 게임의 참가자들을 찾아서 계산
  const metrics = players.map(player => {
    if (allGamesData) {
      // 해당 플레이어가 속한 게임 찾기
      const playerGame = allGamesData.find(game => 
        game.participants && game.participants.some(p => 
          p.RIOT_ID_GAME_NAME === player.RIOT_ID_GAME_NAME && 
          p.TEAM === player.TEAM &&
          p.TIME_PLAYED === player.TIME_PLAYED
        )
      );
      
      const gameParticipants = playerGame ? playerGame.participants : null;
      return calculateAdvancedMetrics(player, null, gameParticipants);
    } else {
      return calculateAdvancedMetrics(player, null, null);
    }
  });
  
  const position = getPlayerPosition(players[0]);
  
  const baseAverages = {
    kda: (metrics.reduce((sum, m) => sum + parseFloat(m.kda), 0) / metrics.length).toFixed(2),
    damageEfficiency: (metrics.reduce((sum, m) => sum + parseFloat(m.damageEfficiency), 0) / metrics.length).toFixed(2),
    goldEfficiency: (metrics.reduce((sum, m) => sum + parseFloat(m.goldEfficiency), 0) / metrics.length).toFixed(2),
    csPerMinute: (metrics.reduce((sum, m) => sum + parseFloat(m.csPerMinute), 0) / metrics.length).toFixed(1),
    visionContribution: (metrics.reduce((sum, m) => sum + parseFloat(m.visionContribution), 0) / metrics.length).toFixed(1),
    killParticipation: (metrics.reduce((sum, m) => sum + parseFloat(m.killParticipation || 0), 0) / metrics.length).toFixed(1),
    earlyKillParticipation: (metrics.reduce((sum, m) => sum + parseFloat(m.earlyKillParticipation || 0), 0) / metrics.length).toFixed(1)
  };

  // 포지션별 특수 지표 추가
  if (position === "JUNGLE") {
    baseAverages.jungleCSPerMinute = (metrics.reduce((sum, m) => sum + parseFloat(m.jungleCSPerMinute || 0), 0) / metrics.length).toFixed(1);
    baseAverages.counterJungleRate = (metrics.reduce((sum, m) => sum + parseFloat(m.counterJungleRate || 0), 0) / metrics.length).toFixed(1);
    baseAverages.ownJungleControl = (metrics.reduce((sum, m) => sum + parseFloat(m.ownJungleControl || 0), 0) / metrics.length).toFixed(1);
  } else if (position === "SUPPORT") {
    baseAverages.wardsPlaced = (metrics.reduce((sum, m) => sum + parseFloat(m.wardsPlaced || 0), 0) / metrics.length).toFixed(1);
    baseAverages.wardsKilled = (metrics.reduce((sum, m) => sum + parseFloat(m.wardsKilled || 0), 0) / metrics.length).toFixed(1);
  }
  
  return baseAverages;
};

// 포지션 내 순위 계산 (개선된 버전)
export const getRankInPosition = (playerValue, positionPlayers, metric, allGamesData = null, uniquePlayerCount = null) => {
  // 고유한 플레이어별로 평균값 계산
  const playerAverages = new Map();
  
  positionPlayers.forEach(p => {
    const playerName = p.RIOT_ID_GAME_NAME;
    
    // 해당 플레이어가 속한 게임 찾기
    let gameParticipants = null;
    if (allGamesData) {
      const playerGame = allGamesData.find(game => 
        game.participants && game.participants.some(participant => 
          participant.RIOT_ID_GAME_NAME === p.RIOT_ID_GAME_NAME && 
          participant.TEAM === p.TEAM &&
          participant.TIME_PLAYED === p.TIME_PLAYED
        )
      );
      gameParticipants = playerGame ? playerGame.participants : null;
    }
    
    // 특수 지표들 처리
    let value;
    if (metric === 'jungleCSPerMinute' || metric === 'counterJungleRate' || metric === 'ownJungleControl') {
      const junglerMetrics = calculateJunglerSpecialMetrics(p, gameParticipants);
      value = parseFloat(junglerMetrics[metric]);
    } else if (metric === 'wardsPlaced' || metric === 'wardsKilled') {
      const supportMetrics = calculateSupportSpecialMetrics(p, gameParticipants);
      value = parseFloat(supportMetrics[metric]);
    } else if (metric === 'earlyKillParticipation') {
      value = parseFloat(calculateEarlyKillParticipation(p, gameParticipants));
    } else {
      const metrics = calculateAdvancedMetrics(p, null, gameParticipants);
      value = parseFloat(metrics[metric]);
    }
    
    // 플레이어별 값들을 누적
    if (!playerAverages.has(playerName)) {
      playerAverages.set(playerName, []);
    }
    playerAverages.get(playerName).push(value);
  });
  
  // 각 플레이어의 평균값 계산
  const uniquePlayerValues = [];
  playerAverages.forEach((values, playerName) => {
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    uniquePlayerValues.push(average);
  });
  
  uniquePlayerValues.push(parseFloat(playerValue));
  uniquePlayerValues.sort((a, b) => b - a); // 내림차순 정렬
  
  const rank = uniquePlayerValues.indexOf(parseFloat(playerValue)) + 1;
  const total = uniquePlayerValues.length;
  return `${total}명 중 ${rank}등`;
};

// 같은 포지션 플레이어들과 비교 (개선된 버전)
export const compareWithSamePosition = (targetPlayerParticipants, allParticipants, playerAverageMetrics, allGamesData = null) => {
  if (targetPlayerParticipants.length === 0) return null;
  
  const targetPosition = getPlayerPosition(targetPlayerParticipants[0]);
  const targetRiotId = targetPlayerParticipants[0].RIOT_ID_GAME_NAME;
  
  // 같은 포지션의 모든 플레이어들 (본인 제외) - 중복 제거하지 않음
  const samePositionPlayers = allParticipants.filter(p => {
    const playerPosition = getPlayerPosition(p);
    const playerRiotId = p.RIOT_ID_GAME_NAME;
    
    return playerPosition === targetPosition && playerRiotId !== targetRiotId;
  });
  
  if (samePositionPlayers.length === 0) {
    return null;
  }
  
  // 고유한 플레이어 수 계산 (순위 표시용)
  const uniquePlayerNames = new Set(samePositionPlayers.map(p => p.RIOT_ID_GAME_NAME));
  const uniquePlayerCount = uniquePlayerNames.size;
  
  // 플레이어의 평균 지표를 직접 사용
  const targetMetrics = playerAverageMetrics;
  const averageMetrics = calculatePositionAverages(samePositionPlayers, allGamesData);
  
  // 기본 순위 정보 (모든 게임 데이터 사용하되, 고유 플레이어 수로 표시)
  const baseRankings = {
    kda: getRankInPosition(targetMetrics.kda, samePositionPlayers, 'kda', allGamesData, uniquePlayerCount),
    damageEfficiency: getRankInPosition(targetMetrics.damageEfficiency, samePositionPlayers, 'damageEfficiency', allGamesData, uniquePlayerCount),
    csPerMinute: getRankInPosition(targetMetrics.csPerMinute, samePositionPlayers, 'csPerMinute', allGamesData, uniquePlayerCount),
    visionContribution: getRankInPosition(targetMetrics.visionContribution, samePositionPlayers, 'visionContribution', allGamesData, uniquePlayerCount),
    killParticipation: getRankInPosition(targetMetrics.killParticipation, samePositionPlayers, 'killParticipation', allGamesData, uniquePlayerCount),
    earlyKillParticipation: getRankInPosition(targetMetrics.earlyKillParticipation, samePositionPlayers, 'earlyKillParticipation', allGamesData, uniquePlayerCount)
  };

  // 포지션별 추가 순위 정보
  if (targetPosition === "JUNGLE") {
    baseRankings.jungleCSPerMinute = getRankInPosition(targetMetrics.jungleCSPerMinute, samePositionPlayers, 'jungleCSPerMinute', allGamesData, uniquePlayerCount);
    baseRankings.counterJungleRate = getRankInPosition(targetMetrics.counterJungleRate, samePositionPlayers, 'counterJungleRate', allGamesData, uniquePlayerCount);
    baseRankings.ownJungleControl = getRankInPosition(targetMetrics.ownJungleControl, samePositionPlayers, 'ownJungleControl', allGamesData, uniquePlayerCount);
  } else if (targetPosition === "SUPPORT") {
    baseRankings.wardsPlaced = getRankInPosition(targetMetrics.wardsPlaced, samePositionPlayers, 'wardsPlaced', allGamesData, uniquePlayerCount);
    baseRankings.wardsKilled = getRankInPosition(targetMetrics.wardsKilled, samePositionPlayers, 'wardsKilled', allGamesData, uniquePlayerCount);
  } else if (["TOP", "MIDDLE", "BOTTOM"].includes(targetPosition)) {
    // 원딜, 탑, 미드에 골드효율성 추가
    baseRankings.goldEfficiency = getRankInPosition(targetMetrics.goldEfficiency, samePositionPlayers, 'goldEfficiency', allGamesData, uniquePlayerCount);
  }
  
  return {
    position: targetPosition,
    playerMetrics: targetMetrics,
    averageMetrics: averageMetrics,
    comparedPlayers: uniquePlayerCount,
    rankings: baseRankings
  };
};

// 최근 N게임 vs 전체 평균 비교 (실제 게임 수 사용)
export const compareRecentVsOverall = (participants, recentGames = 5) => {
  if (participants.length === 0) return null;
  
  const actualRecentGames = Math.min(recentGames, participants.length);
  const recent = participants.slice(-actualRecentGames);
  const overall = participants;
  
  const calculateAverages = (data) => {
    const total = data.length;
    return {
      kda: data.reduce((sum, p) => {
        const metrics = calculateAdvancedMetrics(p);
        return sum + parseFloat(metrics.kda);
      }, 0) / total,
      damageEfficiency: data.reduce((sum, p) => {
        const metrics = calculateAdvancedMetrics(p);
        return sum + parseFloat(metrics.damageEfficiency);
      }, 0) / total,
      goldEfficiency: data.reduce((sum, p) => {
        const metrics = calculateAdvancedMetrics(p);
        return sum + parseFloat(metrics.goldEfficiency);
      }, 0) / total,
      csPerMinute: data.reduce((sum, p) => {
        const metrics = calculateAdvancedMetrics(p);
        return sum + parseFloat(metrics.csPerMinute);
      }, 0) / total
    };
  };

  const recentAvg = calculateAverages(recent);
  const overallAvg = calculateAverages(overall);

  return {
    recent: recentAvg,
    overall: overallAvg,
    gamesAnalyzed: {
      recent: actualRecentGames,
      total: participants.length
    },
    improvement: {
      kda: overallAvg.kda > 0 ? ((recentAvg.kda - overallAvg.kda) / overallAvg.kda * 100).toFixed(1) : 0,
      damageEfficiency: overallAvg.damageEfficiency > 0 ? ((recentAvg.damageEfficiency - overallAvg.damageEfficiency) / overallAvg.damageEfficiency * 100).toFixed(1) : 0,
      goldEfficiency: overallAvg.goldEfficiency > 0 ? ((recentAvg.goldEfficiency - overallAvg.goldEfficiency) / overallAvg.goldEfficiency * 100).toFixed(1) : 0,
      csPerMinute: overallAvg.csPerMinute > 0 ? ((recentAvg.csPerMinute - overallAvg.csPerMinute) / overallAvg.csPerMinute * 100).toFixed(1) : 0
    }
  };
};

// 챔피언별 성능 변화 분석 (SKIN 필드 사용)
export const analyzeChampionPerformance = (participants) => {
  const championData = {};
  
  participants.forEach((p, index) => {
    const champion = getChampionName(p);
    if (!champion || champion === "Unknown") return;
    
    if (!championData[champion]) {
      championData[champion] = [];
    }
    
    const metrics = calculateAdvancedMetrics(p);
    championData[champion].push({
      gameIndex: index,
      ...metrics,
      win: p.WIN === "Win" || p.win === true
    });
  });
  
  // 각 챔피언별 트렌드 계산
  Object.keys(championData).forEach(champion => {
    const games = championData[champion];
    if (games.length > 1) {
      // 최근 게임들의 평균 vs 초기 게임들의 평균
      const half = Math.floor(games.length / 2);
      const early = games.slice(0, half);
      const recent = games.slice(half);
      
      const earlyKDA = early.reduce((sum, g) => sum + parseFloat(g.kda), 0) / early.length;
      const recentKDA = recent.reduce((sum, g) => sum + parseFloat(g.kda), 0) / recent.length;
      const earlyWinRate = early.filter(g => g.win).length / early.length;
      const recentWinRate = recent.filter(g => g.win).length / recent.length;
      
      championData[champion].trend = {
        kdaImprovement: (recentKDA - earlyKDA).toFixed(2),
        winRateImprovement: ((recentWinRate - earlyWinRate) * 100).toFixed(1)
      };
    }
  });
  
  return championData;
};

// 개선점 제안 (포지션별 평균과 비교)
export const suggestImprovements = (playerMetrics, positionAverages) => {
  const suggestions = [];
  
  if (parseFloat(playerMetrics.kda) < parseFloat(positionAverages.kda)) {
    suggestions.push({
      category: "생존력",
      issue: `KDA가 같은 포지션 평균(${positionAverages.kda})보다 낮습니다`,
      suggestion: "데스를 줄이고 킬 관여를 늘려보세요"
    });
  }
  
  if (parseFloat(playerMetrics.damageEfficiency) < parseFloat(positionAverages.damageEfficiency)) {
    suggestions.push({
      category: "딜링",
      issue: `데미지 효율성이 같은 포지션 평균(${positionAverages.damageEfficiency})보다 낮습니다`,
      suggestion: "받는 피해를 줄이면서 딜량을 늘려보세요"
    });
  }
  
  if (parseFloat(playerMetrics.goldEfficiency) < parseFloat(positionAverages.goldEfficiency)) {
    suggestions.push({
      category: "골드 활용",
      issue: `골드 효율성이 같은 포지션 평균(${positionAverages.goldEfficiency})보다 낮습니다`,
      suggestion: "아이템 빌드를 점검하고 딜량을 늘려보세요"
    });
  }
  
  if (parseFloat(playerMetrics.csPerMinute) < parseFloat(positionAverages.csPerMinute)) {
    suggestions.push({
      category: "파밍",
      issue: `CS/분이 같은 포지션 평균(${positionAverages.csPerMinute})보다 낮습니다`,
      suggestion: "라인 클리어와 정글 파밍을 늘려보세요"
    });
  }
  
  // 정글러 전용 제안
  if (playerMetrics.position === "JUNGLE" && playerMetrics.junglerMetrics) {
    const jungleMetrics = playerMetrics.junglerMetrics;
    
    if (parseFloat(jungleMetrics.counterJungleRate) < 10) {
      suggestions.push({
        category: "정글 침입",
        issue: "상대 정글 침입이 부족합니다",
        suggestion: "안전한 타이밍에 상대 정글을 침입해보세요"
      });
    }
    
    if (parseFloat(jungleMetrics.jungleCSPerMinute) < 4) {
      suggestions.push({
        category: "정글 파밍",
        issue: "정글 CS/분이 낮습니다",
        suggestion: "정글 루트를 최적화하고 파밍 효율을 높여보세요"
      });
    }
  }
  
  return suggestions;
};

// 시야 플레이 스타일 분석 (실제 비율 사용)
export const analyzeVisionStyle = (participants) => {
  const totalWardsPlaced = participants.reduce((sum, p) => 
    sum + Number(p.WARD_PLACED || p.wardPlaced || 0), 0);
  const totalWardsKilled = participants.reduce((sum, p) => 
    sum + Number(p.WARD_KILLED || p.wardKilled || 0), 0);
  
  const avgWardsPlaced = totalWardsPlaced / participants.length;
  const avgWardsKilled = totalWardsKilled / participants.length;
  
  let style = "균형형";
  const ratio = avgWardsPlaced / (avgWardsKilled || 1);
  
  if (ratio > 2) {
    style = "수비형 (와드 설치 중심)";
  } else if (ratio < 0.5) {
    style = "공격형 (와드 제거 중심)";
  }
  
  return {
    style,
    wardsPlacedAvg: avgWardsPlaced.toFixed(1),
    wardsKilledAvg: avgWardsKilled.toFixed(1),
    ratio: ratio.toFixed(2)
  };
};

// 사이드별 선호도 분석
export const analyzeSidePreference = (participants) => {
  const blueTeam = participants.filter(p => p.TEAM === "100");
  const redTeam = participants.filter(p => p.TEAM === "200");
  
  const blueWins = blueTeam.filter(p => p.WIN === "Win").length;
  const redWins = redTeam.filter(p => p.WIN === "Win").length;
  
  const blueWinRate = blueTeam.length > 0 ? (blueWins / blueTeam.length * 100).toFixed(1) : 0;
  const redWinRate = redTeam.length > 0 ? (redWins / redTeam.length * 100).toFixed(1) : 0;
  
  return {
    blueWinRate,
    redWinRate,
    preferredSide: parseFloat(blueWinRate) > parseFloat(redWinRate) ? "블루" : "레드",
    difference: Math.abs(parseFloat(blueWinRate) - parseFloat(redWinRate)).toFixed(1)
  };
}; 