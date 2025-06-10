import React, { useState } from "react";
import { groupBySummonerId } from "../utils/groupBySummonerId";
import { allowedIds } from "../utils/allowedIds";
import { championNameMap } from "../utils/championNameMap";
import {
  calculateAdvancedMetrics,
  compareRecentVsOverall,
  analyzeChampionPerformance,
  suggestImprovements,
  analyzeVisionStyle,
  analyzeSidePreference,
  groupPlayersByPosition,
  compareWithSamePosition,
  calculatePositionAverages,
  getPlayerPosition,
  getChampionName,
  calculateEarlyKillParticipation,
  calculateJunglerSpecialMetrics,
  calculateSupportSpecialMetrics
} from "../utils/advancedAnalytics.js";
import {
  calculateObjectiveStats,
  analyzeObjectivePriority,
  calculateObjectiveEfficiency
} from "../utils/objectAnalysis";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

const AdvancedAnalytics = ({ jsonData, version }) => {
  const groupedData = groupBySummonerId(jsonData).filter((data) => {
    const riotId =
      data.participants[0]?.RIOT_ID_GAME_NAME ||
      data.participants[0]?.riotIdGameName;
    return allowedIds.includes(riotId);
  });

  const [selectedRiotId, setSelectedRiotId] = useState(() => {
    const firstValid = groupedData[0]?.participants[0];
    return (
      firstValid?.RIOT_ID_GAME_NAME || firstValid?.riotIdGameName || ""
    );
  });

  const [activeTab, setActiveTab] = useState("advanced");

  const handleSelectChange = (e) => {
    setSelectedRiotId(e.target.value);
  };

  const selectedData = groupedData.find(
    (data) =>
      data.participants[0]?.RIOT_ID_GAME_NAME === selectedRiotId ||
      data.participants[0]?.riotIdGameName === selectedRiotId
  );

  const versionFilteredParticipants =
    selectedData?.participants.filter((p) => {
      const gv = p.gameVersion;
      return gv?.split(".").slice(0, 2).join(".") === version;
    }) || [];

  if (versionFilteredParticipants.length === 0) {
    return <div>해당 버전의 기록이 없습니다</div>;
  }

  // 전체 플레이어 데이터 (포지션 비교용) - participants 배열을 평탄화
  const allVersionFilteredData = jsonData
    .filter((game) => {
      const gv = game.gameVersion;
      return gv?.split(".").slice(0, 2).join(".") === version;
    })
    .flatMap(game => game.participants || []); // participants 배열을 평탄화

  // 고급 지표 계산 - 각 게임별로 해당 게임의 참가자들만 전달
  const advancedMetrics = versionFilteredParticipants.map(participant => {
    // 해당 플레이어가 속한 게임 찾기
    const playerGame = jsonData.find(game => 
      game.participants && game.participants.some(p => 
        p.RIOT_ID_GAME_NAME === participant.RIOT_ID_GAME_NAME && 
        p.TEAM === participant.TEAM &&
        p.TIME_PLAYED === participant.TIME_PLAYED
      )
    );
    
    // 해당 게임의 모든 참가자들
    const gameParticipants = playerGame ? playerGame.participants : null;
    
    return calculateAdvancedMetrics(participant, null, gameParticipants);
  });
  
  const playerPosition = versionFilteredParticipants.length > 0 ? getPlayerPosition(versionFilteredParticipants[0]) : "UNKNOWN";
  
  const avgMetrics = {
    kda: (advancedMetrics.reduce((sum, m) => sum + parseFloat(m.kda), 0) / advancedMetrics.length).toFixed(2),
    killParticipation: (advancedMetrics.reduce((sum, m) => sum + parseFloat(m.killParticipation || 0), 0) / advancedMetrics.length).toFixed(1),
    damageEfficiency: (advancedMetrics.reduce((sum, m) => sum + parseFloat(m.damageEfficiency), 0) / advancedMetrics.length).toFixed(2),
    goldEfficiency: (advancedMetrics.reduce((sum, m) => sum + parseFloat(m.goldEfficiency), 0) / advancedMetrics.length).toFixed(2),
    csPerMinute: (advancedMetrics.reduce((sum, m) => sum + parseFloat(m.csPerMinute), 0) / advancedMetrics.length).toFixed(1),
    visionContribution: (advancedMetrics.reduce((sum, m) => sum + parseFloat(m.visionContribution), 0) / advancedMetrics.length).toFixed(1),
    earlyKillParticipation: (advancedMetrics.reduce((sum, m) => sum + parseFloat(m.earlyKillParticipation || 0), 0) / advancedMetrics.length).toFixed(1)
  };
  
  console.log("계산된 avgMetrics:", avgMetrics);

  // 포지션별 특수 지표 추가
  if (playerPosition === "JUNGLE") {
    const junglerMetrics = versionFilteredParticipants.map((participant, index) => {
      // 해당 플레이어가 속한 게임 찾기
      const playerGame = jsonData.find(game => 
        game.participants && game.participants.some(p => 
          p.RIOT_ID_GAME_NAME === participant.RIOT_ID_GAME_NAME && 
          p.TEAM === participant.TEAM &&
          p.TIME_PLAYED === participant.TIME_PLAYED
        )
      );
      
      const gameParticipants = playerGame ? playerGame.participants : null;
      return calculateJunglerSpecialMetrics(participant, gameParticipants);
    });
    
    avgMetrics.jungleCSPerMinute = (junglerMetrics.reduce((sum, m) => sum + parseFloat(m.jungleCSPerMinute), 0) / junglerMetrics.length).toFixed(1);
    avgMetrics.counterJungleRate = (junglerMetrics.reduce((sum, m) => sum + parseFloat(m.counterJungleRate), 0) / junglerMetrics.length).toFixed(1);
    avgMetrics.ownJungleControl = (junglerMetrics.reduce((sum, m) => sum + parseFloat(m.ownJungleControl), 0) / junglerMetrics.length).toFixed(1);
    avgMetrics.jungleInvasionSuccess = junglerMetrics.some(m => m.jungleInvasionSuccess === "성공") ? "성공" : "없음";
  } else if (playerPosition === "SUPPORT") {
    const supportMetrics = versionFilteredParticipants.map((participant, index) => {
      // 해당 플레이어가 속한 게임 찾기
      const playerGame = jsonData.find(game => 
        game.participants && game.participants.some(p => 
          p.RIOT_ID_GAME_NAME === participant.RIOT_ID_GAME_NAME && 
          p.TEAM === participant.TEAM &&
          p.TIME_PLAYED === participant.TIME_PLAYED
        )
      );
      
      const gameParticipants = playerGame ? playerGame.participants : null;
      return calculateSupportSpecialMetrics(participant, gameParticipants);
    });
    
    avgMetrics.wardsPlaced = (supportMetrics.reduce((sum, m) => sum + parseFloat(m.wardsPlaced), 0) / supportMetrics.length).toFixed(1);
    avgMetrics.wardsKilled = (supportMetrics.reduce((sum, m) => sum + parseFloat(m.wardsKilled), 0) / supportMetrics.length).toFixed(1);
  }

  // 포지션별 비교 분석
  const positionComparison = versionFilteredParticipants.length > 0 ? 
    compareWithSamePosition(versionFilteredParticipants, allVersionFilteredData, avgMetrics, jsonData) : null;

  // 직접 포지션별 평균 계산 함수들 먼저 정의
  function calculateDirectPositionAverages(allData, position, jsonData) {
    const samePositionPlayers = allData.filter(p => getPlayerPosition(p) === position);
    
    if (samePositionPlayers.length === 0) return null;
    
    const metrics = samePositionPlayers.map(p => {
      const playerGame = jsonData.find(game => 
        game.participants && game.participants.some(participant => 
          participant.RIOT_ID_GAME_NAME === p.RIOT_ID_GAME_NAME && 
          participant.TEAM === p.TEAM &&
          participant.TIME_PLAYED === p.TIME_PLAYED
        )
      );
      const gameParticipants = playerGame ? playerGame.participants : null;
      return calculateAdvancedMetrics(p, null, gameParticipants);
    });
    
    const averages = {
      kda: (metrics.reduce((sum, m) => sum + parseFloat(m.kda), 0) / metrics.length).toFixed(2),
      killParticipation: (metrics.reduce((sum, m) => sum + parseFloat(m.killParticipation || 0), 0) / metrics.length).toFixed(1),
      damageEfficiency: (metrics.reduce((sum, m) => sum + parseFloat(m.damageEfficiency), 0) / metrics.length).toFixed(2),
      goldEfficiency: (metrics.reduce((sum, m) => sum + parseFloat(m.goldEfficiency), 0) / metrics.length).toFixed(2),
      csPerMinute: (metrics.reduce((sum, m) => sum + parseFloat(m.csPerMinute), 0) / metrics.length).toFixed(1),
      visionContribution: (metrics.reduce((sum, m) => sum + parseFloat(m.visionContribution), 0) / metrics.length).toFixed(1)
    };

    // 15분전 킬관여율 평균 계산
    const earlyKillParticipationMetrics = samePositionPlayers.map(p => {
      const playerGame = jsonData.find(game => 
        game.participants && game.participants.some(participant => 
          participant.RIOT_ID_GAME_NAME === p.RIOT_ID_GAME_NAME && 
          participant.TEAM === p.TEAM &&
          participant.TIME_PLAYED === p.TIME_PLAYED
        )
      );
      const gameParticipants = playerGame ? playerGame.participants : null;
      return calculateEarlyKillParticipation(p, gameParticipants);
    });
    
    averages.earlyKillParticipation = (earlyKillParticipationMetrics.reduce((sum, m) => sum + parseFloat(m || 0), 0) / earlyKillParticipationMetrics.length).toFixed(1);

    // 포지션별 특수 지표 평균 계산
    if (position === "JUNGLE") {
      const junglerMetrics = samePositionPlayers.map(p => {
        const playerGame = jsonData.find(game => 
          game.participants && game.participants.some(participant => 
            participant.RIOT_ID_GAME_NAME === p.RIOT_ID_GAME_NAME && 
            participant.TEAM === p.TEAM &&
            participant.TIME_PLAYED === p.TIME_PLAYED
          )
        );
        const gameParticipants = playerGame ? playerGame.participants : null;
        return calculateJunglerSpecialMetrics(p, gameParticipants);
      });
      
      averages.jungleCSPerMinute = (junglerMetrics.reduce((sum, m) => sum + parseFloat(m.jungleCSPerMinute), 0) / junglerMetrics.length).toFixed(1);
      averages.counterJungleRate = (junglerMetrics.reduce((sum, m) => sum + parseFloat(m.counterJungleRate), 0) / junglerMetrics.length).toFixed(1);
      averages.ownJungleControl = (junglerMetrics.reduce((sum, m) => sum + parseFloat(m.ownJungleControl), 0) / junglerMetrics.length).toFixed(1);
    } else if (position === "SUPPORT") {
      const supportMetrics = samePositionPlayers.map(p => {
        const playerGame = jsonData.find(game => 
          game.participants && game.participants.some(participant => 
            participant.RIOT_ID_GAME_NAME === p.RIOT_ID_GAME_NAME && 
            participant.TEAM === p.TEAM &&
            participant.TIME_PLAYED === p.TIME_PLAYED
          )
        );
        const gameParticipants = playerGame ? playerGame.participants : null;
        return calculateSupportSpecialMetrics(p, gameParticipants);
      });
      
      averages.wardsPlaced = (supportMetrics.reduce((sum, m) => sum + parseFloat(m.wardsPlaced), 0) / supportMetrics.length).toFixed(1);
      averages.wardsKilled = (supportMetrics.reduce((sum, m) => sum + parseFloat(m.wardsKilled), 0) / supportMetrics.length).toFixed(1);
    }
    
    return averages;
  }

  // 개선된 강점/개선점 분석 함수 (등급 기반)
  const analyzePlayerPerformanceImproved = (avgMetrics, positionGroups, playerPosition) => {
    const improvements = [];
    const strengths = [];
    
    // 포지션별 지표 설정
    const relevantMetrics = {
      JUNGLE: [
        { key: 'kda', label: 'KDA' },
        { key: 'killParticipation', label: '킬관여율' },
        { key: 'earlyKillParticipation', label: '초반 킬관여' },
        { key: 'jungleCSPerMinute', label: '정글 CS/분' },
        { key: 'counterJungleRate', label: '카정 비율' },
        { key: 'damageEfficiency', label: '데미지 효율' },
        { key: 'visionContribution', label: '시야 기여도' }
      ],
      SUPPORT: [
        { key: 'kda', label: 'KDA' },
        { key: 'killParticipation', label: '킬관여율' },
        { key: 'visionContribution', label: '시야 기여도' },
        { key: 'wardsPlaced', label: '와드 설치' },
        { key: 'wardsKilled', label: '와드 제거' },
        { key: 'earlyKillParticipation', label: '초반 킬관여' }
      ],
      DEFAULT: [
        { key: 'kda', label: 'KDA' },
        { key: 'killParticipation', label: '킬관여율' },
        { key: 'damageEfficiency', label: '딜 효율' },
        { key: 'goldEfficiency', label: '골드 효율' },
        { key: 'csPerMinute', label: '분당 CS' },
        { key: 'visionContribution', label: '시야 기여도' }
      ]
    };

    // 지표별 개선 조언
    const improvementSuggestions = {
      'kda': '데스를 줄이고 안전한 포지셔닝을 연습해보세요',
      'killParticipation': '팀과 함께 움직이며 팀파이트에 더 적극적으로 참여해보세요',
      'earlyKillParticipation': '초반 갱킹과 스커미시에 더 적극적으로 참여해보세요',
      'jungleCSPerMinute': '정글 루트를 최적화하고 효율적인 파밍을 연습해보세요',
      'counterJungleRate': '안전한 타이밍에 상대 정글 침입을 시도해보세요',
      'damageEfficiency': '포지셔닝을 개선하고 스킬 콤보 연습을 해보세요',
      'goldEfficiency': '아이템 빌드를 최적화하고 골드 활용도를 높여보세요',
      'csPerMinute': '라인 클리어와 사이드 파밍을 늘려보세요',
      'visionContribution': '와드 설치와 제거를 더 적극적으로 해보세요',
      'wardsPlaced': '더 적극적으로 와드를 설치해보세요',
      'wardsKilled': '상대방 와드를 더 적극적으로 제거해보세요'
    };

    const metrics = relevantMetrics[playerPosition] || relevantMetrics.DEFAULT;
    
    metrics.forEach(({ key, label }) => {
      const playerValue = avgMetrics[key];
      if (!playerValue || !positionGroups[playerPosition]) return;
      
      // 백분위 점수 계산
      const percentileScore = getPercentileValue(playerValue, positionGroups[playerPosition], key);
      const grade = getGradeFromPercentile(percentileScore);
      
      console.log(`${label} (${key}): 값=${playerValue}, 백분위=${percentileScore}, 등급=${grade.grade}`);
      
      // S, A 등급은 강점
      if (grade.grade === 'S' || grade.grade === 'A') {
        strengths.push({
          category: label,
          metric: `${label} (${parseFloat(playerValue).toFixed(1)})`,
          description: `${grade.grade}등급으로 매우 뛰어난 성과를 보이고 있습니다.`
        });
      }
      // D, F 등급은 개선점
      else if (grade.grade === 'D' || grade.grade === 'F') {
        improvements.push({
          category: label,
          metric: `${label} (${parseFloat(playerValue).toFixed(1)})`,
          suggestion: improvementSuggestions[key] || `${grade.grade}등급으로 개선이 필요합니다.`
        });
      }
    });

    return { improvements, strengths };
  };

  // 플레이어 성능 분석 함수 (개선점 + 강점)
  function analyzePlayerPerformance(playerMetrics, positionAverages, position) {
    const improvements = [];
    const strengths = [];
    
    console.log("성능 분석 함수 호출됨");
    console.log("playerMetrics:", playerMetrics);
    console.log("positionAverages:", positionAverages);
    
    // KDA 분석 - 포지션 평균 대비 상대평가 (통일된 기준: ±10%)
    const kdaDiff = parseFloat(playerMetrics.kda) - parseFloat(positionAverages.kda);
    const kdaPercentDiff = (kdaDiff / parseFloat(positionAverages.kda)) * 100;
    if (kdaPercentDiff < -10) { // 평균보다 10% 이상 낮으면 개선점
      improvements.push({
        category: "생존력",
        metric: `KDA ${playerMetrics.kda} (평균 ${positionAverages.kda})`,
        suggestion: "데스 줄이기, 안전한 포지셔닝"
      });
    } else if (kdaPercentDiff > 10) { // 평균보다 10% 이상 높으면 강점
      strengths.push({
        category: "생존력",
        metric: `KDA ${playerMetrics.kda} (평균 ${positionAverages.kda})`,
        description: "우수한 생존력과 킬 관여"
      });
    }
    
    // 데미지 효율성 분석 - 포지션 평균 대비 상대평가 (통일된 기준: ±10%)
    const damageDiff = parseFloat(playerMetrics.damageEfficiency) - parseFloat(positionAverages.damageEfficiency);
    const damagePercentDiff = (damageDiff / parseFloat(positionAverages.damageEfficiency)) * 100;
    if (damagePercentDiff < -10) { // 평균보다 10% 이상 낮으면 개선점
      improvements.push({
        category: "딜링",
        metric: `데미지효율 ${playerMetrics.damageEfficiency} (평균 ${positionAverages.damageEfficiency})`,
        suggestion: "포지셔닝 개선, 스킬 콤보 연습"
      });
    } else if (damagePercentDiff > 10) { // 평균보다 10% 이상 높으면 강점
      strengths.push({
        category: "딜링",
        metric: `데미지효율 ${playerMetrics.damageEfficiency} (평균 ${positionAverages.damageEfficiency})`,
        description: "효율적인 딜링 능력"
      });
    }
    
    // 골드 효율성 분석 - 포지션 평균 대비 상대평가 (통일된 기준: ±10%)
    const goldDiff = parseFloat(playerMetrics.goldEfficiency) - parseFloat(positionAverages.goldEfficiency);
    const goldPercentDiff = (goldDiff / parseFloat(positionAverages.goldEfficiency)) * 100;
    if (goldPercentDiff < -10) { // 평균보다 10% 이상 낮으면 개선점
      improvements.push({
        category: "골드활용",
        metric: `골드효율 ${playerMetrics.goldEfficiency} (평균 ${positionAverages.goldEfficiency})`,
        suggestion: "아이템 빌드 최적화"
      });
    } else if (goldPercentDiff > 10) { // 평균보다 10% 이상 높으면 강점
      strengths.push({
        category: "골드활용",
        metric: `골드효율 ${playerMetrics.goldEfficiency} (평균 ${positionAverages.goldEfficiency})`,
        description: "효율적인 골드 활용"
      });
    }
    
    // CS/분 분석 - 포지션 평균 대비 상대평가 (통일된 기준: ±10%)
    const csDiff = parseFloat(playerMetrics.csPerMinute) - parseFloat(positionAverages.csPerMinute);
    const csPercentDiff = (csDiff / parseFloat(positionAverages.csPerMinute)) * 100;
    if (csPercentDiff < -10) { // 평균보다 10% 이상 낮으면 개선점
      improvements.push({
        category: "파밍",
        metric: `CS/분 ${playerMetrics.csPerMinute} (평균 ${positionAverages.csPerMinute})`,
        suggestion: "라인 클리어, 사이드 파밍 늘리기"
      });
    } else if (csPercentDiff > 10) { // 평균보다 10% 이상 높으면 강점
      strengths.push({
        category: "파밍",
        metric: `CS/분 ${playerMetrics.csPerMinute} (평균 ${positionAverages.csPerMinute})`,
        description: "우수한 파밍 능력"
      });
    }

    // 킬 관여율 분석 - 포지션 평균 대비 상대평가 (통일된 기준: ±10%)
    const kpDiff = parseFloat(playerMetrics.killParticipation) - parseFloat(positionAverages.killParticipation);
    const kpPercentDiff = (kpDiff / parseFloat(positionAverages.killParticipation)) * 100;
    if (kpPercentDiff < -10) { // 평균보다 10% 이상 낮으면 개선점
      improvements.push({
        category: "팀파이트",
        metric: `킬관여 ${playerMetrics.killParticipation}% (평균 ${positionAverages.killParticipation}%)`,
        suggestion: "팀과 함께 움직이기"
      });
    } else if (kpPercentDiff > 10) { // 평균보다 10% 이상 높으면 강점
      strengths.push({
        category: "팀파이트",
        metric: `킬관여 ${playerMetrics.killParticipation}% (평균 ${positionAverages.killParticipation}%)`,
        description: "적극적인 팀파이트 참여"
      });
    }

    // 시야 기여도 분석 - 포지션 평균 대비 상대평가 (통일된 기준: ±10%)
    const visionDiff = parseFloat(playerMetrics.visionContribution) - parseFloat(positionAverages.visionContribution);
    const visionPercentDiff = (visionDiff / parseFloat(positionAverages.visionContribution)) * 100;
    if (visionPercentDiff < -10) { // 평균보다 10% 이상 낮으면 개선점
      improvements.push({
        category: "시야",
        metric: `시야기여 ${playerMetrics.visionContribution}% (평균 ${positionAverages.visionContribution}%)`,
        suggestion: "와드 설치/제거 늘리기"
      });
    } else if (visionPercentDiff > 10) { // 평균보다 10% 이상 높으면 강점
      strengths.push({
        category: "시야",
        metric: `시야기여 ${playerMetrics.visionContribution}% (평균 ${positionAverages.visionContribution}%)`,
        description: "우수한 시야 장악력"
      });
    }
    
    // 포지션별 특수 분석 - 통일된 기준 (±10%)
    if (position === "JUNGLE") {
      // 정글 CS/분 상대평가
      if (playerMetrics.jungleCSPerMinute && positionAverages.jungleCSPerMinute) {
        const jungleCSPercentDiff = ((parseFloat(playerMetrics.jungleCSPerMinute) - parseFloat(positionAverages.jungleCSPerMinute)) / parseFloat(positionAverages.jungleCSPerMinute)) * 100;
        if (jungleCSPercentDiff < -10) { // 평균보다 10% 이상 낮으면 개선점
          improvements.push({
            category: "정글파밍",
            metric: `정글CS/분 ${playerMetrics.jungleCSPerMinute} (평균 ${positionAverages.jungleCSPerMinute})`,
            suggestion: "정글 루트 최적화"
          });
        } else if (jungleCSPercentDiff > 10) { // 평균보다 10% 이상 높으면 강점
          strengths.push({
            category: "정글파밍",
            metric: `정글CS/분 ${playerMetrics.jungleCSPerMinute} (평균 ${positionAverages.jungleCSPerMinute})`,
            description: "효율적인 정글 파밍"
          });
        }
      }
      
      // 카정 비율 상대평가
      if (playerMetrics.counterJungleRate && positionAverages.counterJungleRate) {
        const counterJunglePercentDiff = ((parseFloat(playerMetrics.counterJungleRate) - parseFloat(positionAverages.counterJungleRate)) / parseFloat(positionAverages.counterJungleRate)) * 100;
        if (counterJunglePercentDiff < -10) { // 평균보다 10% 이상 낮으면 개선점
          improvements.push({
            category: "정글침입",
            metric: `카정비율 ${playerMetrics.counterJungleRate}% (평균 ${positionAverages.counterJungleRate}%)`,
            suggestion: "안전한 타이밍에 상대 정글 침입"
          });
        } else if (counterJunglePercentDiff > 10) { // 평균보다 10% 이상 높으면 강점
          strengths.push({
            category: "정글침입",
            metric: `카정비율 ${playerMetrics.counterJungleRate}% (평균 ${positionAverages.counterJungleRate}%)`,
            description: "적극적인 정글 침입"
          });
        }
      }
    } else if (position === "SUPPORT") {
      // 와드 설치 상대평가
      if (playerMetrics.wardsPlaced && positionAverages.wardsPlaced) {
        const wardsPlacedPercentDiff = ((parseFloat(playerMetrics.wardsPlaced) - parseFloat(positionAverages.wardsPlaced)) / parseFloat(positionAverages.wardsPlaced)) * 100;
        if (wardsPlacedPercentDiff < -10) { // 평균보다 10% 이상 낮으면 개선점
          improvements.push({
            category: "시야장악",
            metric: `와드설치 ${playerMetrics.wardsPlaced}개 (평균 ${positionAverages.wardsPlaced}개)`,
            suggestion: "더 적극적인 와드 설치"
          });
        } else if (wardsPlacedPercentDiff > 10) { // 평균보다 10% 이상 높으면 강점
          strengths.push({
            category: "시야장악",
            metric: `와드설치 ${playerMetrics.wardsPlaced}개 (평균 ${positionAverages.wardsPlaced}개)`,
            description: "우수한 시야 제공"
          });
        }
      }
      
      // 와드 제거 상대평가
      if (playerMetrics.wardsKilled && positionAverages.wardsKilled) {
        const wardsKilledPercentDiff = ((parseFloat(playerMetrics.wardsKilled) - parseFloat(positionAverages.wardsKilled)) / parseFloat(positionAverages.wardsKilled)) * 100;
        if (wardsKilledPercentDiff < -10) { // 평균보다 10% 이상 낮으면 개선점
          improvements.push({
            category: "시야차단",
            metric: `와드제거 ${playerMetrics.wardsKilled}개 (평균 ${positionAverages.wardsKilled}개)`,
            suggestion: "더 적극적인 와드 제거"
          });
        } else if (wardsKilledPercentDiff > 10) { // 평균보다 10% 이상 높으면 강점
          strengths.push({
            category: "시야차단",
            metric: `와드제거 ${playerMetrics.wardsKilled}개 (평균 ${positionAverages.wardsKilled}개)`,
            description: "적극적인 시야 차단"
          });
        }
      }
    }
    
    console.log("생성된 improvements:", improvements);
    console.log("생성된 strengths:", strengths);
    return { improvements, strengths };
  }

  // 직접 포지션별 평균 계산
  const directPosAverages = calculateDirectPositionAverages(allVersionFilteredData, playerPosition, jsonData);
  console.log("directPositionAverages:", directPosAverages);
  console.log("avgMetrics:", avgMetrics);
  
  const analysisResult = directPosAverages ? 
    analyzePlayerPerformance(avgMetrics, directPosAverages, playerPosition) : { improvements: [], strengths: [] };

  // 통일된 포지션 평균 사용
  const unifiedPositionComparison = positionComparison ? {
    ...positionComparison,
    positionAverage: directPosAverages // 개선점과 같은 평균 사용
  } : null;

  // 포지션별 그룹화 (레이더 차트에서 사용하므로 먼저 정의)
  const positionGroups = groupPlayersByPosition(allVersionFilteredData);
  
  // 안전성 검사
  if (!positionGroups[playerPosition]) {
    console.error("해당 포지션의 데이터가 없습니다:", playerPosition);
    console.log("사용 가능한 포지션들:", Object.keys(positionGroups));
  }

  // 백분위를 0-100 스케일로 변환하는 함수 (백분위 기반) - 먼저 정의
  const getPercentileValue = (value, positionData, metric) => {
    if (!positionData || positionData.length === 0) return 50;
    
    try {
      const percentileString = calculatePercentile(value, positionData, metric);
      if (!percentileString || percentileString === "N/A") return 50;
      
      const match = percentileString.match(/상위 (\d+)%/);
      if (match) {
        const percentile = parseInt(match[1]);
        return 100 - percentile; // 상위 10% -> 90점, 상위 29% -> 71점
      }
      return 50;
    } catch (error) {
      console.error("백분위 변환 오류:", error);
      return 50;
    }
  };

  // 백분위 점수를 등급으로 변환하는 함수
  const getGradeFromPercentile = (percentileScore) => {
    if (percentileScore >= 95) return { grade: 'S', color: '#e74c3c', bgColor: '#e74c3c' }; // Red
    if (percentileScore >= 85) return { grade: 'A', color: '#f39c12', bgColor: '#f39c12' }; // Orange
    if (percentileScore >= 70) return { grade: 'B+', color: '#f1c40f', bgColor: '#f1c40f' }; // Yellow
    if (percentileScore >= 55) return { grade: 'B', color: '#bdc3c7', bgColor: '#bdc3c7' }; // Light Gray
    if (percentileScore >= 40) return { grade: 'B-', color: '#95a5a6', bgColor: '#95a5a6' }; // Gray
    if (percentileScore >= 25) return { grade: 'C', color: '#3498db', bgColor: '#3498db' }; // Blue
    if (percentileScore >= 10) return { grade: 'D', color: '#2980b9', bgColor: '#2980b9' }; // Darker Blue
    return { grade: 'F', color: '#1f6392', bgColor: '#1f6392' }; // Deep Blue
  };

  // 성능에 따른 카드 배경색 결정 함수 (등급 기반)
  const getCardBackgroundColor = (percentileScore) => {
    const grade = getGradeFromPercentile(percentileScore).grade;
    
    switch(grade) {
      case 'S': return 'rgba(0, 120, 255, 0.9)'; // 매우 선명한 파란색 (S등급)
      case 'A': return 'rgba(34, 139, 34, 0.8)'; // 선명한 초록색 (A등급)
      case 'B+': return 'rgba(70, 130, 180, 0.7)'; // 선명한 연한 파란색 (B+등급)
      case 'B': return 'rgba(100, 149, 237, 0.6)'; // 약간 흐린 파란색 (B등급)
      case 'B-': return 'rgba(119, 136, 153, 0.5)'; // 회색 섞인 파란색 (B-등급)
      case 'C': return 'rgba(128, 128, 128, 0.4)'; // 회색 (C등급)
      case 'D': return 'rgba(220, 53, 69, 0.4)'; // 약간 흐린 연한 투명한 빨간색 (D등급)
      case 'F': return 'rgba(220, 20, 60, 0.8)'; // 매우 선명한 빨간색 (F등급)
      default: return 'rgba(105, 105, 105, 0.3)'; // 기본 회색
    }
  };

  // 백분위 계산 함수
  const calculatePercentile = (value, positionData, metric) => {
    if (!positionData || positionData.length === 0) return "N/A";
    
    // 고유한 플레이어별로 평균값 계산
    const playerAverages = new Map();
    
    positionData.forEach(p => {
      const playerName = p.RIOT_ID_GAME_NAME;
      
      // 해당 플레이어가 속한 게임 찾기
      let gameParticipants = null;
      const playerGame = jsonData.find(game => 
        game.participants && game.participants.some(participant => 
          participant.RIOT_ID_GAME_NAME === p.RIOT_ID_GAME_NAME && 
          participant.TEAM === p.TEAM &&
          participant.TIME_PLAYED === p.TIME_PLAYED
        )
      );
      gameParticipants = playerGame ? playerGame.participants : null;
      
      // 특수 지표들 처리
      let metricValue;
      if (metric === 'jungleCSPerMinute' || metric === 'counterJungleRate' || metric === 'ownJungleControl') {
        const junglerMetrics = calculateJunglerSpecialMetrics(p, gameParticipants);
        metricValue = parseFloat(junglerMetrics[metric]);
      } else if (metric === 'wardsPlaced' || metric === 'wardsKilled') {
        const supportMetrics = calculateSupportSpecialMetrics(p, gameParticipants);
        metricValue = parseFloat(supportMetrics[metric]);
      } else if (metric === 'earlyKillParticipation') {
        metricValue = parseFloat(calculateEarlyKillParticipation(p, gameParticipants));
      } else {
        const metrics = calculateAdvancedMetrics(p, null, gameParticipants);
        metricValue = parseFloat(metrics[metric]);
      }
      
      // 플레이어별 값들을 누적
      if (!playerAverages.has(playerName)) {
        playerAverages.set(playerName, []);
      }
      playerAverages.get(playerName).push(metricValue);
    });
    
    // 각 플레이어의 평균값 계산
    const uniquePlayerValues = [];
    playerAverages.forEach((values, playerName) => {
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      uniquePlayerValues.push(average);
    });
    
    uniquePlayerValues.sort((a, b) => a - b);
    const playerValue = parseFloat(value) || 0;
    
    let rank = uniquePlayerValues.findIndex(v => v >= playerValue);
    if (rank === -1) rank = uniquePlayerValues.length;
    
    const percentile = Math.round((rank / uniquePlayerValues.length) * 100);
    return `상위 ${100 - percentile}%`;
  };

  // 실제 값을 0-100 스케일로 정규화하는 함수
  const normalizeValue = (value, positionData, metric) => {
    if (!positionData || positionData.length === 0) return 50;
    
    try {
      // 포지션별 해당 지표의 모든 값들 수집
      const values = [];
      positionData.forEach(p => {
        let metricValue;
        if (metric === 'jungleCSPerMinute' || metric === 'counterJungleRate' || metric === 'ownJungleControl') {
          const playerGame = jsonData.find(game => 
            game.participants && game.participants.some(participant => 
              participant.RIOT_ID_GAME_NAME === p.RIOT_ID_GAME_NAME && 
              participant.TEAM === p.TEAM &&
              participant.TIME_PLAYED === p.TIME_PLAYED
            )
          );
          const gameParticipants = playerGame ? playerGame.participants : null;
          const junglerMetrics = calculateJunglerSpecialMetrics(p, gameParticipants);
          metricValue = parseFloat(junglerMetrics[metric]);
        } else if (metric === 'wardsPlaced' || metric === 'wardsKilled') {
          const playerGame = jsonData.find(game => 
            game.participants && game.participants.some(participant => 
              participant.RIOT_ID_GAME_NAME === p.RIOT_ID_GAME_NAME && 
              participant.TEAM === p.TEAM &&
              participant.TIME_PLAYED === p.TIME_PLAYED
            )
          );
          const gameParticipants = playerGame ? playerGame.participants : null;
          const supportMetrics = calculateSupportSpecialMetrics(p, gameParticipants);
          metricValue = parseFloat(supportMetrics[metric]);
        } else if (metric === 'earlyKillParticipation') {
          const playerGame = jsonData.find(game => 
            game.participants && game.participants.some(participant => 
              participant.RIOT_ID_GAME_NAME === p.RIOT_ID_GAME_NAME && 
              participant.TEAM === p.TEAM &&
              participant.TIME_PLAYED === p.TIME_PLAYED
            )
          );
          const gameParticipants = playerGame ? playerGame.participants : null;
          metricValue = parseFloat(calculateEarlyKillParticipation(p, gameParticipants));
        } else {
          const playerGame = jsonData.find(game => 
            game.participants && game.participants.some(participant => 
              participant.RIOT_ID_GAME_NAME === p.RIOT_ID_GAME_NAME && 
              participant.TEAM === p.TEAM &&
              participant.TIME_PLAYED === p.TIME_PLAYED
            )
          );
          const gameParticipants = playerGame ? playerGame.participants : null;
          const metrics = calculateAdvancedMetrics(p, null, gameParticipants);
          metricValue = parseFloat(metrics[metric]);
        }
        
        if (!isNaN(metricValue)) {
          values.push(metricValue);
        }
      });
      
      if (values.length === 0) return 50;
      
      const min = Math.min(...values);
      const max = Math.max(...values);
      const playerValue = parseFloat(value) || 0;
      
      // 최소값과 최대값이 같으면 평균값 반환
      if (max === min) return 50;
      
      // 0-100 스케일로 정규화
      const normalized = ((playerValue - min) / (max - min)) * 100;
      return Math.max(0, Math.min(100, normalized));
      
    } catch (error) {
      console.error("정규화 오류:", error);
      return 50;
    }
  };

  // 포지션별 특수 지표를 레이더 차트에 추가
  let radarData = [];
  
  if (playerPosition === "JUNGLE") {
    radarData = [
      {
        subject: 'KDA',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.kda, positionGroups[playerPosition], 'kda')).grade,
        player: getPercentileValue(avgMetrics.kda, positionGroups[playerPosition], 'kda'),
        average: 50, // 평균은 항상 50%로 설정
        fullMark: 100
      },
      {
        subject: '킬 관여율',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.killParticipation, positionGroups[playerPosition], 'killParticipation')).grade,
        player: getPercentileValue(avgMetrics.killParticipation, positionGroups[playerPosition], 'killParticipation'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '정글 CS/분',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.jungleCSPerMinute, positionGroups[playerPosition], 'jungleCSPerMinute')).grade,
        player: getPercentileValue(avgMetrics.jungleCSPerMinute, positionGroups[playerPosition], 'jungleCSPerMinute'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '카정 비율',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.counterJungleRate, positionGroups[playerPosition], 'counterJungleRate')).grade,
        player: getPercentileValue(avgMetrics.counterJungleRate, positionGroups[playerPosition], 'counterJungleRate'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '데미지 효율',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.damageEfficiency, positionGroups[playerPosition], 'damageEfficiency')).grade,
        player: getPercentileValue(avgMetrics.damageEfficiency, positionGroups[playerPosition], 'damageEfficiency'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '시야 기여',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.visionContribution, positionGroups[playerPosition], 'visionContribution')).grade,
        player: getPercentileValue(avgMetrics.visionContribution, positionGroups[playerPosition], 'visionContribution'),
        average: 50,
        fullMark: 100
      }
    ];
  } else if (playerPosition === "SUPPORT") {
    radarData = [
      {
        subject: 'KDA',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.kda, positionGroups[playerPosition], 'kda')).grade,
        player: getPercentileValue(avgMetrics.kda, positionGroups[playerPosition], 'kda'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '킬 관여율',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.killParticipation, positionGroups[playerPosition], 'killParticipation')).grade,
        player: getPercentileValue(avgMetrics.killParticipation, positionGroups[playerPosition], 'killParticipation'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '와드 설치',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.wardsPlaced, positionGroups[playerPosition], 'wardsPlaced')).grade,
        player: getPercentileValue(avgMetrics.wardsPlaced, positionGroups[playerPosition], 'wardsPlaced'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '와드 제거',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.wardsKilled, positionGroups[playerPosition], 'wardsKilled')).grade,
        player: getPercentileValue(avgMetrics.wardsKilled, positionGroups[playerPosition], 'wardsKilled'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '골드 효율',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.goldEfficiency, positionGroups[playerPosition], 'goldEfficiency')).grade,
        player: getPercentileValue(avgMetrics.goldEfficiency, positionGroups[playerPosition], 'goldEfficiency'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '시야 기여',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.visionContribution, positionGroups[playerPosition], 'visionContribution')).grade,
        player: getPercentileValue(avgMetrics.visionContribution, positionGroups[playerPosition], 'visionContribution'),
        average: 50,
        fullMark: 100
      }
    ];
  } else {
    // 기타 포지션 (TOP, MIDDLE, BOTTOM)
    radarData = [
      {
        subject: 'KDA',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.kda, positionGroups[playerPosition], 'kda')).grade,
        player: getPercentileValue(avgMetrics.kda, positionGroups[playerPosition], 'kda'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '킬 관여율',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.killParticipation, positionGroups[playerPosition], 'killParticipation')).grade,
        player: getPercentileValue(avgMetrics.killParticipation, positionGroups[playerPosition], 'killParticipation'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '데미지 효율',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.damageEfficiency, positionGroups[playerPosition], 'damageEfficiency')).grade,
        player: getPercentileValue(avgMetrics.damageEfficiency, positionGroups[playerPosition], 'damageEfficiency'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '골드 효율',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.goldEfficiency, positionGroups[playerPosition], 'goldEfficiency')).grade,
        player: getPercentileValue(avgMetrics.goldEfficiency, positionGroups[playerPosition], 'goldEfficiency'),
        average: 50,
        fullMark: 100
      },
      {
        subject: 'CS/분',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.csPerMinute, positionGroups[playerPosition], 'csPerMinute')).grade,
        player: getPercentileValue(avgMetrics.csPerMinute, positionGroups[playerPosition], 'csPerMinute'),
        average: 50,
        fullMark: 100
      },
      {
        subject: '시야 기여',
        grade: getGradeFromPercentile(getPercentileValue(avgMetrics.visionContribution, positionGroups[playerPosition], 'visionContribution')).grade,
        player: getPercentileValue(avgMetrics.visionContribution, positionGroups[playerPosition], 'visionContribution'),
        average: 50,
        fullMark: 100
      }
    ];
  }

  const CustomizedAxisTick = ({ x, y, payload, index }) => {
    const { value } = payload;
    const dataPoint = radarData[index];
    const grade = dataPoint ? dataPoint.grade : '';
    
    let textAnchor = "middle";
    let yOffset = 0;
    
    // 6각형 차트의 꼭짓점 위치에 따라 텍스트 정렬 및 위치 조정
    if (index === 0) { // 12시
      yOffset = -15;
    } else if (index === 1) { // 2시
      textAnchor = "start";
      x += 10;
    } else if (index === 2) { // 5시
      textAnchor = "start";
      x += 10;
      yOffset = 10;
    } else if (index === 3) { // 6시
      yOffset = 15;
    } else if (index === 4) { // 7시
      textAnchor = "end";
      x -= 10;
      yOffset = 10;
    } else if (index === 5) { // 10시
      textAnchor = "end";
      x -= 10;
    }

    return (
      <g transform={`translate(${x},${y + yOffset})`}>
        <text dy={-4} textAnchor={textAnchor} fill="#E5E7EB" fontSize={14} fontWeight="bold">
          {value}
        </text>
        {grade && (
          <text dy={12} textAnchor={textAnchor} fill="#ffffff" fontSize={16} fontWeight="bold">
            {grade}
          </text>
        )}
      </g>
    );
  };

  // 포지션 평균 대비 퍼센트 계산 함수
  const calculateComparisonPercentage = (playerValue, positionAverage) => {
    if (!positionAverage || positionAverage === 0) return "N/A";
    const player = parseFloat(playerValue) || 0;
    const average = parseFloat(positionAverage) || 0;
    const percentage = ((player - average) / average * 100).toFixed(1);
    return percentage > 0 ? `+${percentage}%` : `${percentage}%`;
  };

  // 개선점 제안 (포지션별 평균과 비교) - 수정된 로직
  // positionComparison에 의존하지 않고 직접 계산

  // 폼 분석
  const formAnalysis = compareRecentVsOverall(versionFilteredParticipants);
  
  // 챔피언 성능 분석
  const championPerformance = analyzeChampionPerformance(versionFilteredParticipants);
  
  // 시야 스타일 분석
  const visionStyle = analyzeVisionStyle(versionFilteredParticipants);
  
  // 사이드 선호도 분석
  const sidePreference = analyzeSidePreference(versionFilteredParticipants);

  // 오브젝트 분석
  const objectiveStats = calculateObjectiveStats(jsonData, version);
  const objectivePriority = analyzeObjectivePriority(jsonData, version);
  const objectiveEfficiency = calculateObjectiveEfficiency(versionFilteredParticipants);

  // 정글러 전용 지표
  const isJungler = versionFilteredParticipants.length > 0 && 
    getPlayerPosition(versionFilteredParticipants[0]) === "JUNGLE";
  const junglerMetrics = isJungler ? 
    versionFilteredParticipants.map(p => calculateAdvancedMetrics(p).junglerMetrics).filter(Boolean) : [];

  // 기존 분석 결과를 새로운 함수로 교체 (positionGroups 정의 이후로 이동)
  const improvedAnalysisResult = analyzePlayerPerformanceImproved(avgMetrics, positionGroups, playerPosition);

  return (
    <div>
      {/* 플레이어 선택 */}
      <div className="mb-4">
        <label htmlFor="riotIdSelect" className="form-label">
          Riot ID 선택:
        </label>
        <select
          id="riotIdSelect"
          className="form-select"
          value={selectedRiotId}
          onChange={handleSelectChange}
        >
          {groupedData.map((data, index) => (
            <option
              key={index}
              value={
                data.participants[0]?.RIOT_ID_GAME_NAME ||
                data.participants[0]?.riotIdGameName
              }
            >
              {data.participants[0]?.RIOT_ID_GAME_NAME ||
                data.participants[0]?.riotIdGameName}
            </option>
          ))}
        </select>
      </div>

      {/* 플레이어 정보 표시 */}
      {versionFilteredParticipants.length > 0 && (
        <div className="alert mb-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}>
          <strong className="text-white">플레이어:</strong> {selectedRiotId} | 
          <strong className="text-white"> 주 포지션:</strong> {getPlayerPosition(versionFilteredParticipants[0])} | 
          <strong className="text-white"> 분석 게임 수:</strong> {versionFilteredParticipants.length}게임
        </div>
      )}

      {/* 탭 네비게이션 */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "advanced" ? "active" : ""}`}
            onClick={() => setActiveTab("advanced")}
          >
            고급 지표
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "position" ? "active" : ""}`}
            onClick={() => setActiveTab("position")}
          >
            포지션 비교
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "form" ? "active" : ""}`}
            onClick={() => setActiveTab("form")}
          >
            폼 분석
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "champion" ? "active" : ""}`}
            onClick={() => setActiveTab("champion")}
          >
            챔피언 분석
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "style" ? "active" : ""}`}
            onClick={() => setActiveTab("style")}
          >
            플레이 스타일
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "objective" ? "active" : ""}`}
            onClick={() => setActiveTab("objective")}
          >
            오브젝트 분석
          </button>
        </li>
      </ul>

      {/* 고급 지표 탭 */}
      {activeTab === "advanced" && (
        <div>
          <h5 className="text-white">고급 분석 지표</h5>
          
          {/* 레이더 차트와 주요 지표 */}
          <div className="row mb-4">
            {/* 레이더 차트 */}
            <div className="col-lg-8">
              <div className="card" style={{ backgroundColor: '#1a1a1a', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: '#2a2a2a', border: 'none' }}>
                  <h6 className="mb-0 text-white">
                    <i className="bi bi-radar me-2"></i>포지션 내 백분위 순위
                  </h6>
                  <small className="text-light">회색: 포지션 평균, 주황색: 내 성능 (백분위 기준)</small>
                </div>
                <div className="card-body" style={{ height: '400px', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="75%">
                      <PolarGrid stroke="#444" />
                      <PolarAngleAxis dataKey="subject" tick={<CustomizedAxisTick />} />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        tick={{ fill: '#888', fontSize: 10 }}
                        tickCount={6}
                      />
                      <Radar
                        name="평균"
                        dataKey="average"
                        stroke="#666"
                        fill="#333"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Radar
                        name="개인"
                        dataKey="player"
                        stroke="#ff6b35"
                        fill="#ff6b35"
                        fillOpacity={0.4}
                        strokeWidth={3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 주요 지표 박스들 */}
            <div className="col-lg-4">
              <div className="row g-3">
                {/* KDA */}
                <div className="col-12">
                  <div className="card text-center" style={{ 
                    backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.kda, positionGroups[playerPosition], 'kda')), 
                    border: 'none' 
                  }}>
                    <div className="card-body py-3">
                      <h6 className="card-title text-white mb-2">KDA</h6>
                      <div className="h3 fw-bold text-white mb-1">{avgMetrics.kda}</div>
                      <small className="text-white">{calculatePercentile(avgMetrics.kda, positionGroups[playerPosition], 'kda')}</small>
                      {positionComparison?.positionAverage && (
                        <div className="mt-1">
                          <small className={`badge ${parseFloat(calculateComparisonPercentage(avgMetrics.kda, positionComparison.positionAverage.kda).replace('%', '')) >= 0 ? 'bg-success' : 'bg-danger'}`}>
                            포지션 평균 대비 {calculateComparisonPercentage(avgMetrics.kda, positionComparison.positionAverage.kda)}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 데미지 효율성 */}
                <div className="col-6">
                  <div className="card text-center" style={{ 
                    backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.damageEfficiency, positionGroups[playerPosition], 'damageEfficiency')), 
                    border: '1px solid #444' 
                  }}>
                    <div className="card-body py-2">
                      <h6 className="card-title text-white mb-1" style={{ fontSize: '0.8rem' }}>데미지 효율</h6>
                      <div className="h5 fw-bold text-white mb-1">{avgMetrics.damageEfficiency}</div>
                      <small className="text-white">{calculatePercentile(avgMetrics.damageEfficiency, positionGroups[playerPosition], 'damageEfficiency')}</small>
                      {positionComparison?.positionAverage && (
                        <div className="mt-1">
                          <small className={`badge ${parseFloat(calculateComparisonPercentage(avgMetrics.damageEfficiency, positionComparison.positionAverage.damageEfficiency).replace('%', '')) >= 0 ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.6rem' }}>
                            {calculateComparisonPercentage(avgMetrics.damageEfficiency, positionComparison.positionAverage.damageEfficiency)}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 골드 효율성 */}
                <div className="col-6">
                  <div className="card text-center" style={{ 
                    backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.goldEfficiency, positionGroups[playerPosition], 'goldEfficiency')), 
                    border: '1px solid #444' 
                  }}>
                    <div className="card-body py-2">
                      <h6 className="card-title text-white mb-1" style={{ fontSize: '0.8rem' }}>골드 효율</h6>
                      <div className="h5 fw-bold text-white mb-1">{avgMetrics.goldEfficiency}</div>
                      <small className="text-white">{calculatePercentile(avgMetrics.goldEfficiency, positionGroups[playerPosition], 'goldEfficiency')}</small>
                      {positionComparison?.positionAverage && (
                        <div className="mt-1">
                          <small className={`badge ${parseFloat(calculateComparisonPercentage(avgMetrics.goldEfficiency, positionComparison.positionAverage.goldEfficiency).replace('%', '')) >= 0 ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.6rem' }}>
                            {calculateComparisonPercentage(avgMetrics.goldEfficiency, positionComparison.positionAverage.goldEfficiency)}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* CS/분 */}
                <div className="col-6">
                  <div className="card text-center" style={{ 
                    backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.csPerMinute, positionGroups[playerPosition], 'csPerMinute')), 
                    border: '1px solid #444' 
                  }}>
                    <div className="card-body py-2">
                      <h6 className="card-title text-white mb-1" style={{ fontSize: '0.8rem' }}>CS/분</h6>
                      <div className="h5 fw-bold text-white mb-1">{avgMetrics.csPerMinute}</div>
                      <small className="text-white">{calculatePercentile(avgMetrics.csPerMinute, positionGroups[playerPosition], 'csPerMinute')}</small>
                      {positionComparison?.positionAverage && (
                        <div className="mt-1">
                          <small className={`badge ${parseFloat(calculateComparisonPercentage(avgMetrics.csPerMinute, positionComparison.positionAverage.csPerMinute).replace('%', '')) >= 0 ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.6rem' }}>
                            {calculateComparisonPercentage(avgMetrics.csPerMinute, positionComparison.positionAverage.csPerMinute)}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 시야 기여도 */}
                <div className="col-6">
                  <div className="card text-center" style={{ 
                    backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.visionContribution, positionGroups[playerPosition], 'visionContribution')), 
                    border: '1px solid #444' 
                  }}>
                    <div className="card-body py-2">
                      <h6 className="card-title text-white mb-1" style={{ fontSize: '0.8rem' }}>시야 기여</h6>
                      <div className="h5 fw-bold text-white mb-1">{avgMetrics.visionContribution}%</div>
                      <small className="text-white">{calculatePercentile(avgMetrics.visionContribution, positionGroups[playerPosition], 'visionContribution')}</small>
                      {positionComparison?.positionAverage && (
                        <div className="mt-1">
                          <small className={`badge ${parseFloat(calculateComparisonPercentage(avgMetrics.visionContribution, positionComparison.positionAverage.visionContribution).replace('%', '')) >= 0 ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.6rem' }}>
                            {calculateComparisonPercentage(avgMetrics.visionContribution, positionComparison.positionAverage.visionContribution)}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 세부 지표들 */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card text-center" style={{ 
                backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.earlyKillParticipation, positionGroups[playerPosition], 'earlyKillParticipation')), 
                border: 'none' 
              }}>
                <div className="card-body py-3">
                  <h6 className="card-title text-white mb-2">초반 킬관여</h6>
                  <div className="h4 fw-bold text-white mb-1">{avgMetrics.earlyKillParticipation}%</div>
                  <small className="text-white">{calculatePercentile(avgMetrics.earlyKillParticipation, positionGroups[playerPosition], 'earlyKillParticipation')}</small>
                </div>
              </div>
            </div>
            
            <div className="col-md-3">
              <div className="card text-center" style={{ 
                backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.killParticipation, positionGroups[playerPosition], 'killParticipation')), 
                border: 'none' 
              }}>
                <div className="card-body py-3">
                  <h6 className="card-title text-white mb-2">킬 관여율</h6>
                  <div className="h4 fw-bold text-white mb-1">{avgMetrics.killParticipation}%</div>
                  <small className="text-white">{calculatePercentile(avgMetrics.killParticipation, positionGroups[playerPosition], 'killParticipation')}</small>
                </div>
              </div>
            </div>

            {playerPosition === "JUNGLE" && (
              <>
                <div className="col-md-3">
                  <div className="card text-center" style={{ 
                    backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.jungleCSPerMinute, positionGroups[playerPosition], 'jungleCSPerMinute')), 
                    border: 'none' 
                  }}>
                    <div className="card-body py-3">
                      <h6 className="card-title text-white mb-2">정글 CS/분</h6>
                      <div className="h4 fw-bold text-white mb-1">{avgMetrics.jungleCSPerMinute}</div>
                      <small className="text-white">{calculatePercentile(avgMetrics.jungleCSPerMinute, positionGroups[playerPosition], 'jungleCSPerMinute')}</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card text-center" style={{ 
                    backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.counterJungleRate, positionGroups[playerPosition], 'counterJungleRate')), 
                    border: 'none' 
                  }}>
                    <div className="card-body py-3">
                      <h6 className="card-title text-white mb-2">카정 비율</h6>
                      <div className="h4 fw-bold text-white mb-1">{avgMetrics.counterJungleRate}%</div>
                      <small className="text-white">{calculatePercentile(avgMetrics.counterJungleRate, positionGroups[playerPosition], 'counterJungleRate')}</small>
                    </div>
                  </div>
                </div>
              </>
            )}

            {playerPosition === "SUPPORT" && (
              <>
                <div className="col-md-3">
                  <div className="card text-center" style={{ 
                    backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.wardsPlaced, positionGroups[playerPosition], 'wardsPlaced')), 
                    border: 'none' 
                  }}>
                    <div className="card-body py-3">
                      <h6 className="card-title text-white mb-2">와드 설치</h6>
                      <div className="h4 fw-bold text-white mb-1">{avgMetrics.wardsPlaced}</div>
                      <small className="text-white">{calculatePercentile(avgMetrics.wardsPlaced, positionGroups[playerPosition], 'wardsPlaced')}</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card text-center" style={{ 
                    backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.wardsKilled, positionGroups[playerPosition], 'wardsKilled')), 
                    border: 'none' 
                  }}>
                    <div className="card-body py-3">
                      <h6 className="card-title text-white mb-2">와드 제거</h6>
                      <div className="h4 fw-bold text-white mb-1">{avgMetrics.wardsKilled}</div>
                      <small className="text-white">{calculatePercentile(avgMetrics.wardsKilled, positionGroups[playerPosition], 'wardsKilled')}</small>
                    </div>
                  </div>
                </div>
              </>
            )}

            {(playerPosition !== "JUNGLE" && playerPosition !== "SUPPORT") && (
              <>
                <div className="col-md-3">
                  <div className="card text-center" style={{ 
                    backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.damageEfficiency, positionGroups[playerPosition], 'damageEfficiency')), 
                    border: 'none' 
                  }}>
                    <div className="card-body py-3">
                      <h6 className="card-title text-white mb-2">데미지 효율</h6>
                      <div className="h4 fw-bold text-white mb-1">{avgMetrics.damageEfficiency}</div>
                      <small className="text-white">{calculatePercentile(avgMetrics.damageEfficiency, positionGroups[playerPosition], 'damageEfficiency')}</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card text-center" style={{ 
                    backgroundColor: getCardBackgroundColor(getPercentileValue(avgMetrics.goldEfficiency, positionGroups[playerPosition], 'goldEfficiency')), 
                    border: 'none' 
                  }}>
                    <div className="card-body py-3">
                      <h6 className="card-title text-white mb-2">골드 효율</h6>
                      <div className="h4 fw-bold text-white mb-1">{avgMetrics.goldEfficiency}</div>
                      <small className="text-white">{calculatePercentile(avgMetrics.goldEfficiency, positionGroups[playerPosition], 'goldEfficiency')}</small>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 사이드별 선호도 */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card" style={{ backgroundColor: '#1a1a1a', border: 'none' }}>
                <div className="card-header" style={{ backgroundColor: '#2a2a2a', border: 'none' }}>
                  <h6 className="mb-0 text-white">
                    <i className="bi bi-pie-chart me-2"></i>사이드별 선호도
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-6">
                      <div className="border-end border-secondary">
                        <h5 className="text-primary">{sidePreference.blueWinRate}%</h5>
                        <small className="text-light">블루 사이드 승률</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <h5 className="text-danger">{sidePreference.redWinRate}%</h5>
                      <small className="text-light">레드 사이드 승률</small>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <span className="badge bg-secondary">
                      선호 사이드: {sidePreference.preferredSide} (차이: {sidePreference.difference}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 정글러 전용 지표 */}
            {isJungler && junglerMetrics.length > 0 && (
              <div className="row mb-4">
                <div className="col-md-12">
                  <div className="card" style={{ backgroundColor: '#1a1a1a', border: 'none' }}>
                    <div className="card-header" style={{ backgroundColor: '#2a2a2a', border: 'none' }}>
                      <h6 className="mb-0 text-white">
                        <i className="bi bi-tree me-2"></i>정글러 전용 지표
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row g-2">
                        <div className="col-6">
                          <div className="text-center p-2 rounded" style={{ backgroundColor: '#2a2a2a' }}>
                            <div className="fw-bold text-white">{(junglerMetrics.reduce((sum, m) => sum + parseFloat(m.jungleCSPerMinute), 0) / junglerMetrics.length).toFixed(1)}</div>
                            <small className="text-light">정글 CS/분</small>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="text-center p-2 rounded" style={{ backgroundColor: '#2a2a2a' }}>
                            <div className="fw-bold text-white">{(junglerMetrics.reduce((sum, m) => sum + parseFloat(m.counterJungleRate), 0) / junglerMetrics.length).toFixed(1)}%</div>
                            <small className="text-light">상대 정글 침입률</small>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="text-center p-2 rounded" style={{ backgroundColor: '#2a2a2a' }}>
                            <div className="fw-bold text-white">{(junglerMetrics.reduce((sum, m) => sum + parseFloat(m.ownJungleControl), 0) / junglerMetrics.length).toFixed(1)}%</div>
                            <small className="text-light">자체 정글 장악률</small>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="text-center p-2 rounded" style={{ backgroundColor: '#2a2a2a' }}>
                            <div className="fw-bold text-white">{junglerMetrics.filter(m => m.jungleInvasionSuccess === "성공").length}/{junglerMetrics.length}</div>
                            <small className="text-light">정글 침입 성공</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 개선점 & 강점 제안 */}
          <div className="row mb-4">
            {/* 개선점 */}
            <div className="col-md-6">
              <h6 className="text-warning">
                <i className="bi bi-arrow-up-circle me-2"></i>개선 필요 영역
              </h6>
              {improvedAnalysisResult.improvements.length > 0 ? (
                <div className="row g-2">
                  {improvedAnalysisResult.improvements.map((improvement, index) => (
                    <div key={index} className="col-12">
                      <div className="card border-warning" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-body py-2">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <span className="badge bg-warning text-dark me-2">{improvement.category}</span>
                              <small className="text-light">{improvement.metric}</small>
                            </div>
                          </div>
                          <small className="text-white mt-1 d-block">💡 {improvement.suggestion}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-success" style={{ backgroundColor: '#1a1a1a', border: '1px solid #28a745' }}>
                  <small className="text-light">개선해야 할 점이 없습니다.</small>
                </div>
              )}
            </div>

            {/* 강점 */}
            <div className="col-md-6">
              <h6 className="text-success">
                <i className="bi bi-star me-2"></i>주요 강점
              </h6>
              {improvedAnalysisResult.strengths.length > 0 ? (
                <div className="row g-2">
                  {improvedAnalysisResult.strengths.map((strength, index) => (
                    <div key={index} className="col-12">
                      <div className="card border-success" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-body py-2">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <span className="badge bg-success me-2">{strength.category}</span>
                              <small className="text-light">{strength.metric}</small>
                            </div>
                          </div>
                          <small className="text-white mt-1 d-block">⭐ {strength.description}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-info" style={{ backgroundColor: '#1a1a1a', border: '1px solid #17a2b8' }}>
                  <small className="text-light">특별한 강점이 발견되지 않았습니다.</small>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 포지션 비교 탭 */}
      {activeTab === "position" && (
        <div>
          {unifiedPositionComparison ? (
            <div>
              {/* 정글러 전용 비교 */}
              {unifiedPositionComparison.position === "JUNGLE" && (
                <div>
                  <div className="row g-3 mb-3">
                    {/* 정글 CS/분 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header" style={{ backgroundColor: '#2a2a2a', border: 'none' }}>
                          <h6 className="mb-0 text-white">
                            <i className="bi bi-tree me-2"></i>
                            정글 CS/분
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-warning mb-1">
                                {avgMetrics.jungleCSPerMinute}
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages?.jungleCSPerMinute || "N/A"}
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-warning text-dark fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.jungleCSPerMinute || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 카정 비율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-crosshair me-2"></i>
                            카정 비율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-danger mb-1">
                                {avgMetrics.counterJungleRate}%
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages?.counterJungleRate || "N/A"}%
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-danger fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.counterJungleRate || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 풀캠 비율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-shield-check me-2"></i>
                            풀캠 비율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-success mb-1">
                                {avgMetrics.ownJungleControl}%
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages?.ownJungleControl || "N/A"}%
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-success fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.ownJungleControl || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* KDA */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-award me-2"></i>
                            KDA
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-primary mb-1">
                                {unifiedPositionComparison.playerMetrics.kda}
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages.kda}
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-primary fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.kda}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 15분 이전 킬관여율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-clock me-2"></i>
                            15분전 킬관여율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-info mb-1">
                                {avgMetrics.earlyKillParticipation}%
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages.earlyKillParticipation || "N/A"}%
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-info fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.earlyKillParticipation || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 킬관여율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-people me-2"></i>
                            킬관여율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-white mb-1">
                                {unifiedPositionComparison.playerMetrics.killParticipation}%
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages.killParticipation}%
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-secondary fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.killParticipation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 서포터 전용 비교 */}
              {unifiedPositionComparison.position === "SUPPORT" && (
                <div>
                  <div className="row g-3 mb-3">
                    {/* 시야 설치 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-eye me-2"></i>
                            시야 설치
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-success mb-1">
                                {avgMetrics.wardsPlaced}
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages?.wardsPlaced || "N/A"}
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-success fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.wardsPlaced || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 시야 제거 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-eye-slash me-2"></i>
                            시야 제거
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-danger mb-1">
                                {avgMetrics.wardsKilled}
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages?.wardsKilled || "N/A"}
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-danger fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.wardsKilled || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* KDA */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-award me-2"></i>
                            KDA
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-primary mb-1">
                                {unifiedPositionComparison.playerMetrics.kda}
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages.kda}
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-primary fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.kda}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 15분 이전 킬관여율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-clock me-2"></i>
                            15분전 킬관여율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-info mb-1">
                                {avgMetrics.earlyKillParticipation}%
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages.earlyKillParticipation || "N/A"}%
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-info fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.earlyKillParticipation || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 킬관여율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-people me-2"></i>
                            킬관여율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-white mb-1">
                                {unifiedPositionComparison.playerMetrics.killParticipation}%
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages.killParticipation}%
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-secondary fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.killParticipation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 기타 포지션 (TOP, MIDDLE, BOTTOM) */}
              {!["JUNGLE", "SUPPORT"].includes(unifiedPositionComparison.position) && (
                <div>
                  <div className="row g-3 mb-3">
                    {/* KDA */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-award me-2"></i>
                            KDA
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-primary mb-1">
                                {unifiedPositionComparison.playerMetrics.kda}
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages.kda}
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-primary fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.kda}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 데미지 효율성 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-lightning me-2"></i>
                            데미지 효율성
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-danger mb-1">
                                {unifiedPositionComparison.playerMetrics.damageEfficiency}
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages.damageEfficiency}
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-danger fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.damageEfficiency}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 골드 효율성 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-coin me-2"></i>
                            골드 효율성
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-warning mb-1">
                                {unifiedPositionComparison.playerMetrics.goldEfficiency}
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages.goldEfficiency}
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-warning text-dark fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.goldEfficiency || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CS/분 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: '#1a1a1a' }}>
                        <div className="card-header text-white text-center py-2" style={{ backgroundColor: '#2a2a2a' }}>
                          <h6 className="mb-0">
                            <i className="bi bi-graph-up me-2"></i>
                            CS/분
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end border-secondary">
                              <div className="h3 fw-bold text-success mb-1">
                                {unifiedPositionComparison.playerMetrics.csPerMinute}
                              </div>
                              <small className="text-light">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {directPosAverages.csPerMinute}
                              </div>
                              <small className="text-light">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-success fs-6 px-2 py-1">
                              {unifiedPositionComparison.rankings.csPerMinute}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 종합 평가 */}
              <div className="card border-0" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="card-body text-center py-4">
                  <h5 className="mb-3 text-white">
                    <i className="bi bi-clipboard-check me-2"></i>
                    종합 평가
                  </h5>
                  <p className="mb-0 fs-6 text-light">
                    <strong className="text-white">{unifiedPositionComparison.position}</strong> 포지션에서 총 <strong className="text-white">{unifiedPositionComparison.comparedPlayers + 1}명</strong>의 플레이어와 비교한 결과입니다.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-warning text-center py-5">
              <i className="bi bi-exclamation-triangle fs-1 mb-3 d-block"></i>
              <h5>비교 데이터 없음</h5>
              <p className="mb-0">같은 포지션의 다른 플레이어가 없어 비교할 수 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* 폼 분석 탭 */}
      {activeTab === "form" && (
        <div>
          <h5 className="text-white">폼 분석</h5>
          {formAnalysis ? (
            <div>
              {/* 분석 정보 */}
              <div className="alert mb-4" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff' }}>
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h6 className="mb-1 text-white">
                      <i className="bi bi-graph-up"></i> 최근 성과 vs 전체 평균
                    </h6>
                    <small className="text-light">최근 {formAnalysis.gamesAnalyzed.recent}게임과 전체 {formAnalysis.gamesAnalyzed.total}게임의 성과를 비교합니다</small>
                  </div>
                  <div className="col-md-4 text-end">
                    <span className="badge bg-primary fs-6">폼 분석</span>
                  </div>
                </div>
              </div>
              
              {/* 성과 비교 카드들 */}
              <div className="row g-3 mb-4">
                {/* KDA 비교 */}
                <div className="col-md-3">
                  <div className="card h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                    <div className="card-body text-center">
                      <h6 className="card-title text-primary">KDA</h6>
                      <div className="display-6 fw-bold text-white mb-2">
                        {formAnalysis.recent.kda.toFixed(2)}
                      </div>
                      <div className="text-light mb-2">
                        전체: {formAnalysis.overall.kda.toFixed(2)}
                      </div>
                      <span className={`badge fs-6 ${parseFloat(formAnalysis.improvement.kda) >= 0 ? 'bg-success' : 'bg-danger'}`}>
                        {formAnalysis.improvement.kda > 0 ? '+' : ''}{formAnalysis.improvement.kda}%
                      </span>
                      <div className="mt-2">
                        {parseFloat(formAnalysis.improvement.kda) >= 0 ? (
                          <small className="text-success">
                            <i className="bi bi-arrow-up"></i> 상승세
                          </small>
                        ) : (
                          <small className="text-danger">
                            <i className="bi bi-arrow-down"></i> 하락세
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 데미지 효율성 비교 */}
                <div className="col-md-3">
                  <div className="card h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                    <div className="card-body text-center">
                      <h6 className="card-title text-danger">데미지 효율성</h6>
                      <div className="display-6 fw-bold text-white mb-2">
                        {formAnalysis.recent.damageEfficiency.toFixed(2)}
                      </div>
                      <div className="text-light mb-2">
                        전체: {formAnalysis.overall.damageEfficiency.toFixed(2)}
                      </div>
                      <span className={`badge fs-6 ${parseFloat(formAnalysis.improvement.damageEfficiency) >= 0 ? 'bg-success' : 'bg-danger'}`}>
                        {formAnalysis.improvement.damageEfficiency > 0 ? '+' : ''}{formAnalysis.improvement.damageEfficiency}%
                      </span>
                      <div className="mt-2">
                        {parseFloat(formAnalysis.improvement.damageEfficiency) >= 0 ? (
                          <small className="text-success">
                            <i className="bi bi-arrow-up"></i> 상승세
                          </small>
                        ) : (
                          <small className="text-danger">
                            <i className="bi bi-arrow-down"></i> 하락세
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 골드 효율성 비교 */}
                <div className="col-md-3">
                  <div className="card h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                    <div className="card-body text-center">
                      <h6 className="card-title text-warning">골드 효율성</h6>
                      <div className="display-6 fw-bold text-white mb-2">
                        {formAnalysis.recent.goldEfficiency.toFixed(2)}
                      </div>
                      <div className="text-light mb-2">
                        전체: {formAnalysis.overall.goldEfficiency.toFixed(2)}
                      </div>
                      <span className={`badge fs-6 ${parseFloat(formAnalysis.improvement.goldEfficiency) >= 0 ? 'bg-success' : 'bg-danger'}`}>
                        {formAnalysis.improvement.goldEfficiency > 0 ? '+' : ''}{formAnalysis.improvement.goldEfficiency}%
                      </span>
                      <div className="mt-2">
                        {parseFloat(formAnalysis.improvement.goldEfficiency) >= 0 ? (
                          <small className="text-success">
                            <i className="bi bi-arrow-up"></i> 상승세
                          </small>
                        ) : (
                          <small className="text-danger">
                            <i className="bi bi-arrow-down"></i> 하락세
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CS/분 비교 */}
                <div className="col-md-3">
                  <div className="card h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                    <div className="card-body text-center">
                      <h6 className="card-title text-success">CS/분</h6>
                      <div className="display-6 fw-bold text-white mb-2">
                        {formAnalysis.recent.csPerMinute.toFixed(1)}
                      </div>
                      <div className="text-light mb-2">
                        전체: {formAnalysis.overall.csPerMinute.toFixed(1)}
                      </div>
                      <span className={`badge fs-6 ${parseFloat(formAnalysis.improvement.csPerMinute) >= 0 ? 'bg-success' : 'bg-danger'}`}>
                        {formAnalysis.improvement.csPerMinute > 0 ? '+' : ''}{formAnalysis.improvement.csPerMinute}%
                      </span>
                      <div className="mt-2">
                        {parseFloat(formAnalysis.improvement.csPerMinute) >= 0 ? (
                          <small className="text-success">
                            <i className="bi bi-arrow-up"></i> 상승세
                          </small>
                        ) : (
                          <small className="text-danger">
                            <i className="bi bi-arrow-down"></i> 하락세
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 종합 폼 평가 */}
              <div className="card border-0" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="card-body">
                  <h6 className="card-title text-white">
                    <i className="bi bi-speedometer2"></i> 종합 폼 평가
                  </h6>
                  <div className="row">
                    <div className="col-md-8">
                      {(() => {
                        let improvingCount = 0;
                        const improvements = [
                          formAnalysis.improvement.kda,
                          formAnalysis.improvement.damageEfficiency,
                          formAnalysis.improvement.goldEfficiency,
                          formAnalysis.improvement.csPerMinute
                        ];
                        
                        improvements.forEach(imp => {
                          if (parseFloat(imp) > 0) improvingCount++;
                        });
                        
                        const percentage = (improvingCount / 4) * 100;
                        
                        return (
                          <>
                            <p className="mb-2 text-light">
                              {improvingCount}/4 지표에서 최근 성과가 전체 평균보다 향상되었습니다.
                            </p>
                            <div className="progress" style={{height: '20px'}}>
                              <div 
                                className={`progress-bar ${percentage >= 75 ? 'bg-success' : percentage >= 50 ? 'bg-primary' : percentage >= 25 ? 'bg-warning' : 'bg-danger'}`}
                                style={{width: `${percentage}%`}}
                              >
                                {percentage.toFixed(0)}%
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="col-md-4 text-end">
                      {(() => {
                        let improvingCount = 0;
                        const improvements = [
                          formAnalysis.improvement.kda,
                          formAnalysis.improvement.damageEfficiency,
                          formAnalysis.improvement.goldEfficiency,
                          formAnalysis.improvement.csPerMinute
                        ];
                        
                        improvements.forEach(imp => {
                          if (parseFloat(imp) > 0) improvingCount++;
                        });
                        
                        if (improvingCount >= 3) {
                          return <span className="badge bg-success fs-6">상승세</span>;
                        } else if (improvingCount >= 2) {
                          return <span className="badge bg-primary fs-6">안정세</span>;
                        } else if (improvingCount >= 1) {
                          return <span className="badge bg-warning fs-6">혼재</span>;
                        } else {
                          return <span className="badge bg-danger fs-6">하락세</span>;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="bi bi-graph-down text-light" style={{fontSize: '3rem'}}></i>
              </div>
              <h6>폼 분석 데이터 부족</h6>
              <p className="text-light">
                폼 분석을 위한 충분한 게임 데이터가 없습니다.<br/>
                최소 5게임 이상의 데이터가 필요합니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 챔피언 분석 탭 */}
      {activeTab === "champion" && (
        <div>
          <h5 className="text-white">챔피언별 성능 분석</h5>
          {Object.keys(championPerformance).length > 0 ? (
            <div className="row g-3">
              {Object.entries(championPerformance).map(([champion, data]) => (
                <div key={champion} className="col-md-6 col-lg-4 mb-4">
                  <div className="card h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                    <div className="card-header text-white" style={{ backgroundColor: '#2a2a2a' }}>
                      <h6 className="mb-0">
                        <i className="bi bi-person-circle me-2"></i>
                        {champion}
                      </h6>
                    </div>
                    <div className="card-body">
                      {/* 기본 통계 */}
                      <div className="row text-center mb-3">
                        <div className="col-4">
                          <div className="border-end border-secondary">
                            <h5 className="text-primary mb-1">{data.length}</h5>
                            <small className="text-light">게임</small>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="border-end border-secondary">
                            <h5 className="text-success mb-1">
                              {((data.filter(g => g.win).length / data.length) * 100).toFixed(0)}%
                            </h5>
                            <small className="text-light">승률</small>
                          </div>
                        </div>
                        <div className="col-4">
                          <h5 className="text-warning mb-1">
                            {(data.reduce((sum, g) => sum + parseFloat(g.kda), 0) / data.length).toFixed(1)}
                          </h5>
                          <small className="text-light">평균 KDA</small>
                        </div>
                      </div>

                      {/* 트렌드 정보 */}
                      {data.trend && (
                        <div className="mt-3">
                          <h6 className="text-light mb-2">성장 트렌드</h6>
                          <div className="row">
                            <div className="col-6">
                              <div className="d-flex align-items-center">
                                <span className="me-2 text-white">KDA:</span>
                                <span className={`badge ${parseFloat(data.trend.kdaImprovement) >= 0 ? 'bg-success' : 'bg-danger'}`}>
                                  {data.trend.kdaImprovement > 0 ? '+' : ''}{data.trend.kdaImprovement}
                                </span>
                              </div>
                            </div>
                            <div className="col-6">
                              <div className="d-flex align-items-center">
                                <span className="me-2 text-white">승률:</span>
                                <span className={`badge ${parseFloat(data.trend.winRateImprovement) >= 0 ? 'bg-success' : 'bg-danger'}`}>
                                  {data.trend.winRateImprovement > 0 ? '+' : ''}{data.trend.winRateImprovement}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 성능 평가 */}
                      <div className="mt-3">
                        {(() => {
                          const winRate = (data.filter(g => g.win).length / data.length) * 100;
                          const avgKDA = data.reduce((sum, g) => sum + parseFloat(g.kda), 0) / data.length;
                          
                          if (winRate >= 70 && avgKDA >= 2.0) {
                            return <span className="badge bg-success w-100">주력 챔피언</span>;
                          } else if (winRate >= 50 && avgKDA >= 1.5) {
                            return <span className="badge bg-primary w-100">안정적</span>;
                          } else if (data.length >= 3) {
                            return <span className="badge bg-warning w-100">연습 필요</span>;
                          } else {
                            return <span className="badge bg-secondary w-100">데이터 부족</span>;
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="bi bi-person-x text-light" style={{fontSize: '3rem'}}></i>
              </div>
              <h6>챔피언 데이터 없음</h6>
              <p className="text-light">
                분석할 챔피언 데이터가 없습니다.<br/>
                게임을 더 플레이해주세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 포지션 내 백분위 순위 탭 */}
      {activeTab === "style" && (
        <div>
          <h5 className="text-white">포지션 내 백분위 순위 분석</h5>
          <div className="row g-3">
            {/* 시야 포지션 내 백분위 순위 */}
            <div className="col-md-6">
              <div className="card h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                <div className="card-header" style={{ backgroundColor: '#2a2a2a', border: 'none' }}>
                  <h6 className="mb-0 text-white">
                    <i className="bi bi-eye"></i> 시야 포지션 내 백분위 순위
                  </h6>
                </div>
                <div className="card-body">
                  <div className="text-center mb-3">
                    <h4 className="text-primary">{visionStyle.style}</h4>
                  </div>
                  
                  <div className="row text-center mb-3">
                    <div className="col-6">
                      <div className="border-end border-secondary">
                        <h5 className="text-success mb-1">{visionStyle.wardsPlacedAvg}</h5>
                        <small className="text-light">평균 와드 설치</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <h5 className="text-danger mb-1">{visionStyle.wardsKilledAvg}</h5>
                      <small className="text-light">평균 와드 제거</small>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="badge bg-info fs-6">
                      설치/제거 비율: {visionStyle.ratio}
                    </span>
                  </div>

                  {/* 스타일별 설명 */}
                  <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#2a2a2a' }}>
                    <small className="text-light">
                      {visionStyle.style === "수비형 (와드 설치 중심)" && 
                        "팀의 시야 확보에 중점을 두는 안정적인 포지션 내 백분위 순위입니다."
                      }
                      {visionStyle.style === "공격형 (와드 제거 중심)" && 
                        "상대방의 시야를 차단하는 공격적인 포지션 내 백분위 순위입니다."
                      }
                      {visionStyle.style === "균형형" && 
                        "와드 설치와 제거를 균형있게 하는 안정적인 포지션 내 백분위 순위입니다."
                      }
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* 사이드별 성과 상세 */}
            <div className="col-md-6">
              <div className="card h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                <div className="card-header" style={{ backgroundColor: '#2a2a2a', border: 'none' }}>
                  <h6 className="mb-0 text-white">
                    <i className="bi bi-diagram-3"></i> 사이드별 성과 상세
                  </h6>
                </div>
                <div className="card-body">
                  <div className="text-center mb-3">
                    <h4 className="text-primary">선호 사이드: {sidePreference.preferredSide}</h4>
                  </div>

                  {/* 사이드별 승률 비교 */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-white">블루 사이드</span>
                      <span className="fw-bold text-primary">{sidePreference.blueWinRate}%</span>
                    </div>
                    <div className="progress mb-3" style={{height: '8px'}}>
                      <div 
                        className="progress-bar bg-primary" 
                        style={{width: `${sidePreference.blueWinRate}%`}}
                      ></div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-white">레드 사이드</span>
                      <span className="fw-bold text-danger">{sidePreference.redWinRate}%</span>
                    </div>
                    <div className="progress mb-3" style={{height: '8px'}}>
                      <div 
                        className="progress-bar bg-danger" 
                        style={{width: `${sidePreference.redWinRate}%`}}
                      ></div>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="badge bg-secondary fs-6">
                      승률 차이: {sidePreference.difference}%
                    </span>
                  </div>

                  {/* 사이드별 조언 */}
                  <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#2a2a2a' }}>
                    <small className="text-light">
                      {parseFloat(sidePreference.difference) > 20 && 
                        "특정 사이드에서 현저히 좋은 성과를 보이고 있습니다. 해당 사이드의 장점을 분석해보세요."
                      }
                      {parseFloat(sidePreference.difference) <= 20 && parseFloat(sidePreference.difference) > 10 && 
                        "사이드별로 약간의 성과 차이가 있습니다. 균형잡힌 플레이를 위해 약한 사이드를 보완해보세요."
                      }
                      {parseFloat(sidePreference.difference) <= 10 && 
                        "사이드에 관계없이 안정적인 성과를 보이고 있습니다."
                      }
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 오브젝트 분석 탭 */}
      {activeTab === "objective" && (
        <div>
          <h5>오브젝트 분석</h5>
          
          {/* 오브젝트별 승률 카드들 */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="card text-center h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                <div className="card-body">
                  <div className="mb-2">
                    <i className="bi bi-trophy text-warning" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6 className="card-title text-white">바론</h6>
                  <h4 className="text-warning">{objectiveStats.baron.winRate}%</h4>
                  <small className="text-light">{objectiveStats.baron.games}게임 참여</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                <div className="card-body">
                  <div className="mb-2">
                    <i className="bi bi-fire text-danger" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6 className="card-title text-white">드래곤</h6>
                  <h4 className="text-danger">{objectiveStats.dragon.winRate}%</h4>
                  <small className="text-light">{objectiveStats.dragon.games}게임 참여</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                <div className="card-body">
                  <div className="mb-2">
                    <i className="bi bi-eye text-primary" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6 className="card-title text-white">전령</h6>
                  <h4 className="text-primary">{objectiveStats.herald.winRate}%</h4>
                  <small className="text-light">{objectiveStats.herald.games}게임 참여</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                <div className="card-body">
                  <div className="mb-2">
                    <i className="bi bi-bug text-success" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6 className="card-title text-white">유충</h6>
                  <h4 className="text-success">{objectiveStats.voidgrub.winRate}%</h4>
                  <small className="text-light">{objectiveStats.voidgrub.games}게임 참여</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {/* 오브젝트 우선순위 */}
            <div className="col-md-6">
              <div className="card h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                <div className="card-header" style={{ backgroundColor: '#2a2a2a', border: 'none' }}>
                  <h6 className="mb-0 text-white">
                    <i className="bi bi-list-ol"></i> 오브젝트 우선순위
                  </h6>
                </div>
                <div className="card-body">
                  {objectivePriority.priority && objectivePriority.priority.length > 0 ? (
                    <div className="list-group list-group-flush">
                      {objectivePriority.priority.slice(0, 4).map((obj, index) => (
                        <div key={index} className="list-group-item d-flex justify-content-between align-items-center px-0" style={{ backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #333' }}>
                          <div className="d-flex align-items-center">
                            <span className={`badge me-3 ${
                              index === 0 ? 'bg-warning' : 
                              index === 1 ? 'bg-secondary' : 
                              index === 2 ? 'bg-dark' : 'bg-light text-dark'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="text-white">{obj.name || `${index + 1}순위`}</span>
                          </div>
                          {obj.rate && (
                            <small className="text-light">{obj.rate}%</small>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-light py-3">
                      <i className="bi bi-info-circle mb-2" style={{fontSize: '2rem'}}></i>
                      <p>우선순위 데이터가 없습니다</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 개인 오브젝트 효율성 */}
            <div className="col-md-6">
              <div className="card h-100" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                <div className="card-header" style={{ backgroundColor: '#2a2a2a', border: 'none' }}>
                  <h6 className="mb-0 text-white">
                    <i className="bi bi-person-check"></i> 개인 오브젝트 효율성
                  </h6>
                </div>
                <div className="card-body">
                  {objectiveEfficiency ? (
                    <div>
                      <div className="row text-center mb-3">
                        <div className="col-6">
                          <div className="border-end border-secondary">
                            <h5 className="text-primary mb-1">{objectiveEfficiency.totalParticipation}</h5>
                            <small className="text-light">총 참여</small>
                          </div>
                        </div>
                        <div className="col-6">
                          <h5 className="text-success mb-1">{objectiveEfficiency.successRate}%</h5>
                          <small className="text-light">성공률</small>
                        </div>
                      </div>

                      <div className="progress mb-3" style={{height: '10px'}}>
                        <div 
                          className={`progress-bar ${
                            parseFloat(objectiveEfficiency.successRate) >= 70 ? 'bg-success' :
                            parseFloat(objectiveEfficiency.successRate) >= 50 ? 'bg-primary' :
                            parseFloat(objectiveEfficiency.successRate) >= 30 ? 'bg-warning' : 'bg-danger'
                          }`}
                          style={{width: `${objectiveEfficiency.successRate}%`}}
                        >
                          {objectiveEfficiency.successRate}%
                        </div>
                      </div>

                      <div className="text-center">
                        {parseFloat(objectiveEfficiency.successRate) >= 70 && (
                          <span className="badge bg-success">오브젝트 마스터</span>
                        )}
                        {parseFloat(objectiveEfficiency.successRate) >= 50 && parseFloat(objectiveEfficiency.successRate) < 70 && (
                          <span className="badge bg-primary">안정적</span>
                        )}
                        {parseFloat(objectiveEfficiency.successRate) >= 30 && parseFloat(objectiveEfficiency.successRate) < 50 && (
                          <span className="badge bg-warning fs-6">개선 필요</span>
                        )}
                        {parseFloat(objectiveEfficiency.successRate) < 30 && (
                          <span className="badge bg-danger fs-6">집중 연습 필요</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-light py-3">
                      <i className="bi bi-info-circle mb-2" style={{fontSize: '2rem'}}></i>
                      <p>효율성 데이터가 없습니다</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 오브젝트 분석 팁 */}
          <div className="mt-4">
            <div className="card border-0" style={{ backgroundColor: '#1a1a1a' }}>
              <div className="card-body">
                <h6 className="card-title text-white">
                  <i className="bi bi-lightbulb"></i> 오브젝트 분석 팁
                </h6>
                <div className="row">
                  <div className="col-md-6">
                    <ul className="list-unstyled mb-0">
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <small className="text-light">바론 승률이 높다면 후반 운영에 강점이 있습니다</small>
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <small className="text-light">드래곤 승률이 높다면 중반 싸움에 강합니다</small>
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <ul className="list-unstyled mb-0">
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <small className="text-light">전령 승률이 높다면 초반 라인 우위를 잘 활용합니다</small>
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <small className="text-light">유충 승률이 높다면 초중반 스노볼링에 능합니다</small>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalytics; 