// 오브젝트 컨트롤 패턴 분석

// 팀별 오브젝트 통계 계산
export const calculateObjectiveStats = (jsonData, version) => {
  const versionedGames = jsonData.filter(game => {
    const gv = game.gameVersion;
    return gv?.split(".").slice(0, 2).join(".") === version;
  });

  const stats = {
    baron: { games: 0, wins: 0, winRate: 0 },
    dragon: { games: 0, wins: 0, winRate: 0 },
    herald: { games: 0, wins: 0, winRate: 0 },
    voidgrub: { games: 0, wins: 0, winRate: 0 }
  };

  versionedGames.forEach(game => {
    const participants = game.participants || [];
    const team100 = participants.filter(p => p.TEAM === "100");
    const team200 = participants.filter(p => p.TEAM === "200");
    
    if (team100.length === 0 || team200.length === 0) return;
    
    const team100Baron = team100.reduce((sum, p) => sum + (Number(p.BARON_KILLS) || 0), 0);
    const team200Baron = team200.reduce((sum, p) => sum + (Number(p.BARON_KILLS) || 0), 0);
    
    const team100Dragon = team100.reduce((sum, p) => sum + (Number(p.DRAGON_KILLS) || 0), 0);
    const team200Dragon = team200.reduce((sum, p) => sum + (Number(p.DRAGON_KILLS) || 0), 0);
    
    const team100Herald = team100.reduce((sum, p) => sum + (Number(p.RIFT_HERALD_KILLS) || 0), 0);
    const team200Herald = team200.reduce((sum, p) => sum + (Number(p.RIFT_HERALD_KILLS) || 0), 0);
    
    const team100Voidgrub = team100.reduce((sum, p) => sum + (Number(p.Missions_VoidMitesSummoned) || 0), 0);
    const team200Voidgrub = team200.reduce((sum, p) => sum + (Number(p.Missions_VoidMitesSummoned) || 0), 0);
    
    // 승리 팀 확인
    const team100Won = team100.some(p => p.WIN === "Win");
    
    // 바론 분석
    if (team100Baron > 0 || team200Baron > 0) {
      stats.baron.games++;
      if ((team100Baron > team200Baron && team100Won) || (team200Baron > team100Baron && !team100Won)) {
        stats.baron.wins++;
      }
    }
    
    // 드래곤 분석
    if (team100Dragon > 0 || team200Dragon > 0) {
      stats.dragon.games++;
      if ((team100Dragon > team200Dragon && team100Won) || (team200Dragon > team100Dragon && !team100Won)) {
        stats.dragon.wins++;
      }
    }
    
    // 전령 분석
    if (team100Herald > 0 || team200Herald > 0) {
      stats.herald.games++;
      if ((team100Herald > team200Herald && team100Won) || (team200Herald > team100Herald && !team100Won)) {
        stats.herald.wins++;
      }
    }
    
    // 공허 유충 분석
    if (team100Voidgrub > 0 || team200Voidgrub > 0) {
      stats.voidgrub.games++;
      if ((team100Voidgrub > team200Voidgrub && team100Won) || (team200Voidgrub > team100Voidgrub && !team100Won)) {
        stats.voidgrub.wins++;
      }
    }
  });

  // 승률 계산
  Object.keys(stats).forEach(obj => {
    if (stats[obj].games > 0) {
      stats[obj].winRate = ((stats[obj].wins / stats[obj].games) * 100).toFixed(1);
    }
  });

  return stats;
};

// 오브젝트 우선순위 분석
export const analyzeObjectivePriority = (jsonData, version) => {
  const versionedGames = jsonData.filter(game => {
    const gv = game.gameVersion;
    return gv?.split(".").slice(0, 2).join(".") === version;
  });

  const totalObjectives = {
    baron: 0,
    dragon: 0,
    herald: 0,
    voidgrub: 0
  };

  versionedGames.forEach(game => {
    const participants = game.participants || [];
    participants.forEach(participant => {
      totalObjectives.baron += Number(participant.BARON_KILLS) || 0;
      totalObjectives.dragon += Number(participant.DRAGON_KILLS) || 0;
      totalObjectives.herald += Number(participant.RIFT_HERALD_KILLS) || 0;
      totalObjectives.voidgrub += Number(participant.Missions_VoidMitesSummoned) || 0;
    });
  });

  const total = Object.values(totalObjectives).reduce((sum, val) => sum + val, 0);
  
  // 우선순위 배열로 정렬
  const priorityArray = Object.entries(totalObjectives)
    .map(([name, count]) => ({
      name: name === 'voidgrub' ? '공허 유충' : 
            name === 'baron' ? '바론' :
            name === 'dragon' ? '드래곤' :
            name === 'herald' ? '전령' : name,
      count,
      rate: total > 0 ? ((count / total) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.count - a.count);

  return {
    priority: priorityArray,
    total: total
  };
};

// 게임별 오브젝트 컨트롤 효율성
export const calculateObjectiveEfficiency = (participants) => {
  if (participants.length === 0) {
    return {
      avgObjectivesPerGame: 0,
      objectiveWinCorrelation: 0
    };
  }

  const totalObjectives = participants.reduce((sum, p) => {
    return sum + 
      (Number(p.BARON_KILLS) || 0) +
      (Number(p.DRAGON_KILLS) || 0) +
      (Number(p.RIFT_HERALD_KILLS) || 0) +
      (Number(p.Missions_VoidMitesSummoned) || 0);
  }, 0);

  const wins = participants.filter(p => p.WIN === "Win").length;
  const totalGames = participants.length;

  return {
    avgObjectivesPerGame: totalGames > 0 ? (totalObjectives / totalGames).toFixed(1) : 0,
    objectiveWinCorrelation: totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0
  };
}; 