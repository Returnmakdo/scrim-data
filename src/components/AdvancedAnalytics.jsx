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

  // 포지션별 그룹화
  const positionGroups = groupPlayersByPosition(allVersionFilteredData);

  // 폼 분석
  const formAnalysis = compareRecentVsOverall(versionFilteredParticipants);
  
  // 챔피언 성능 분석
  const championPerformance = analyzeChampionPerformance(versionFilteredParticipants);
  
  // 시야 스타일 분석
  const visionStyle = analyzeVisionStyle(versionFilteredParticipants);
  
  // 사이드 선호도 분석
  const sidePreference = analyzeSidePreference(versionFilteredParticipants);

  // 개선점 제안 (포지션별 평균과 비교)
  const positionAverages = positionComparison?.positionAverage || avgMetrics;
  const improvements = suggestImprovements(avgMetrics, positionAverages);

  // 오브젝트 분석
  const objectiveStats = calculateObjectiveStats(jsonData, version);
  const objectivePriority = analyzeObjectivePriority(jsonData, version);
  const objectiveEfficiency = calculateObjectiveEfficiency(versionFilteredParticipants);

  // 정글러 전용 지표
  const isJungler = versionFilteredParticipants.length > 0 && 
    getPlayerPosition(versionFilteredParticipants[0]) === "JUNGLE";
  const junglerMetrics = isJungler ? 
    versionFilteredParticipants.map(p => calculateAdvancedMetrics(p).junglerMetrics).filter(Boolean) : [];

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
        <div className="alert alert-info mb-4">
          <strong>플레이어:</strong> {selectedRiotId} | 
          <strong> 주 포지션:</strong> {getPlayerPosition(versionFilteredParticipants[0])} | 
          <strong> 분석 게임 수:</strong> {versionFilteredParticipants.length}게임
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
          <h5>고급 분석 지표</h5>
          
          {/* 주요 지표 카드들 */}
          <div className="row g-3 mb-4">
            <div className="col-md-2">
              <div className="card text-center h-100">
                <div className="card-body">
                  <h6 className="card-title text-primary">KDA</h6>
                  <div className="display-6 fw-bold">{avgMetrics.kda}</div>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card text-center h-100">
                <div className="card-body">
                  <h6 className="card-title text-danger">데미지 효율성</h6>
                  <div className="display-6 fw-bold">{avgMetrics.damageEfficiency}</div>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div className="card text-center h-100">
                <div className="card-body">
                  <h6 className="card-title text-warning">골드 효율성</h6>
                  <div className="display-6 fw-bold">{avgMetrics.goldEfficiency}</div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center h-100">
                <div className="card-body">
                  <h6 className="card-title text-success">CS/분</h6>
                  <div className="display-6 fw-bold">{avgMetrics.csPerMinute}</div>
                  <small className="text-muted">실제 게임시간 기준</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center h-100">
                <div className="card-body">
                  <h6 className="card-title text-info">시야 기여도</h6>
                  <div className="display-6 fw-bold">{avgMetrics.visionContribution}<small>%</small></div>
                </div>
              </div>
            </div>
          </div>

          {/* 사이드별 선호도 */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="bi bi-pie-chart"></i> 사이드별 선호도
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-6">
                      <div className="border-end">
                        <h5 className="text-primary">{sidePreference.blueWinRate}%</h5>
                        <small className="text-muted">블루 사이드 승률</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <h5 className="text-danger">{sidePreference.redWinRate}%</h5>
                      <small className="text-muted">레드 사이드 승률</small>
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
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="bi bi-tree"></i> 정글러 전용 지표
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-2">
                      <div className="col-6">
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold">{(junglerMetrics.reduce((sum, m) => sum + parseFloat(m.jungleCSPerMinute), 0) / junglerMetrics.length).toFixed(1)}</div>
                          <small className="text-muted">정글 CS/분</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold">{(junglerMetrics.reduce((sum, m) => sum + parseFloat(m.counterJungleRate), 0) / junglerMetrics.length).toFixed(1)}%</div>
                          <small className="text-muted">상대 정글 침입률</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold">{(junglerMetrics.reduce((sum, m) => sum + parseFloat(m.ownJungleControl), 0) / junglerMetrics.length).toFixed(1)}%</div>
                          <small className="text-muted">자체 정글 장악률</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="text-center p-2 bg-light rounded">
                          <div className="fw-bold">{junglerMetrics.filter(m => m.jungleInvasionSuccess === "성공").length}/{junglerMetrics.length}</div>
                          <small className="text-muted">정글 침입 성공</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 개선점 제안 */}
          <div className="mb-4">
            <h6>
              <i className="bi bi-lightbulb"></i> 개선점 제안
            </h6>
            {improvements.length > 0 ? (
              <div className="row g-3">
                {improvements.map((improvement, index) => (
                  <div key={index} className="col-md-6">
                    <div className="card border-warning h-100">
                      <div className="card-body">
                        <div className="d-flex align-items-center mb-2">
                          <i className="bi bi-exclamation-triangle text-warning me-2"></i>
                          <h6 className="card-title mb-0">{improvement.category}</h6>
                        </div>
                        <p className="card-text mb-2">
                          <small className="text-muted">{improvement.issue}</small>
                        </p>
                        <p className="card-text">
                          <strong>💡 제안:</strong> {improvement.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-success">
                <i className="bi bi-check-circle me-2"></i>
                모든 지표가 평균 이상입니다! 현재 플레이를 유지하세요.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 포지션 비교 탭 */}
      {activeTab === "position" && (
        <div>
          {positionComparison ? (
            <div>
              {/* 정글러 전용 비교 */}
              {positionComparison.position === "JUNGLE" && (
                <div>
                  <div className="row g-3 mb-3">
                    {/* 정글 CS/분 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-warning text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-speedometer2 me-2"></i>
                            정글 CS/분
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-warning mb-1">
                                {avgMetrics.jungleCSPerMinute}
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.jungleCSPerMinute || "N/A"}
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-warning text-dark fs-6 px-2 py-1">
                              {positionComparison.rankings.jungleCSPerMinute || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 카정 비율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-danger text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-crosshair me-2"></i>
                            카정 비율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-danger mb-1">
                                {avgMetrics.counterJungleRate}%
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.counterJungleRate || "N/A"}%
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-danger fs-6 px-2 py-1">
                              {positionComparison.rankings.counterJungleRate || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 풀캠 비율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-success text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-shield-check me-2"></i>
                            풀캠 비율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-success mb-1">
                                {avgMetrics.ownJungleControl}%
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.ownJungleControl || "N/A"}%
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-success fs-6 px-2 py-1">
                              {positionComparison.rankings.ownJungleControl || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* KDA */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-primary text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-award me-2"></i>
                            KDA
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-primary mb-1">
                                {positionComparison.playerMetrics.kda}
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.kda}
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-primary fs-6 px-2 py-1">
                              {positionComparison.rankings.kda}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 15분 이전 킬관여율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-info text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-clock me-2"></i>
                            15분전 킬관여율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-info mb-1">
                                {avgMetrics.earlyKillParticipation}%
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.earlyKillParticipation || "N/A"}%
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-info fs-6 px-2 py-1">
                              {positionComparison.rankings.earlyKillParticipation || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 킬관여율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-dark text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-people me-2"></i>
                            킬관여율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-dark mb-1">
                                {positionComparison.playerMetrics.killParticipation}%
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.killParticipation}%
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-dark fs-6 px-2 py-1">
                              {positionComparison.rankings.killParticipation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 서포터 전용 비교 */}
              {positionComparison.position === "SUPPORT" && (
                <div>
                  <div className="row g-3 mb-3">
                    {/* 시야 설치 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-success text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-eye me-2"></i>
                            시야 설치
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-success mb-1">
                                {avgMetrics.wardsPlaced}
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.wardsPlaced || "N/A"}
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-success fs-6 px-2 py-1">
                              {positionComparison.rankings.wardsPlaced || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 시야 제거 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-danger text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-eye-slash me-2"></i>
                            시야 제거
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-danger mb-1">
                                {avgMetrics.wardsKilled}
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.wardsKilled || "N/A"}
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-danger fs-6 px-2 py-1">
                              {positionComparison.rankings.wardsKilled || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* KDA */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-primary text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-award me-2"></i>
                            KDA
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-primary mb-1">
                                {positionComparison.playerMetrics.kda}
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.kda}
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-primary fs-6 px-2 py-1">
                              {positionComparison.rankings.kda}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 15분 이전 킬관여율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-info text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-clock me-2"></i>
                            15분전 킬관여율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-info mb-1">
                                {avgMetrics.earlyKillParticipation}%
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.earlyKillParticipation || "N/A"}%
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-info fs-6 px-2 py-1">
                              {positionComparison.rankings.earlyKillParticipation || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 킬관여율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-dark text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-people me-2"></i>
                            킬관여율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-dark mb-1">
                                {positionComparison.playerMetrics.killParticipation}%
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.killParticipation}%
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-dark fs-6 px-2 py-1">
                              {positionComparison.rankings.killParticipation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 기타 포지션 (TOP, MIDDLE, BOTTOM) */}
              {!["JUNGLE", "SUPPORT"].includes(positionComparison.position) && (
                <div>
                  <div className="row g-3 mb-3">
                    {/* KDA */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-primary text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-award me-2"></i>
                            KDA
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-primary mb-1">
                                {positionComparison.playerMetrics.kda}
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.kda}
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-primary fs-6 px-2 py-1">
                              {positionComparison.rankings.kda}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 데미지 효율성 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-danger text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-lightning me-2"></i>
                            데미지 효율성
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-danger mb-1">
                                {positionComparison.playerMetrics.damageEfficiency}
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.damageEfficiency}
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-danger fs-6 px-2 py-1">
                              {positionComparison.rankings.damageEfficiency}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 골드 효율성 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-warning text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-coin me-2"></i>
                            골드 효율성
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-warning mb-1">
                                {positionComparison.playerMetrics.goldEfficiency}
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.goldEfficiency}
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-warning text-dark fs-6 px-2 py-1">
                              {positionComparison.rankings.goldEfficiency || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CS/분 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-success text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-graph-up me-2"></i>
                            CS/분
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-success mb-1">
                                {positionComparison.playerMetrics.csPerMinute}
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.csPerMinute}
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-success fs-6 px-2 py-1">
                              {positionComparison.rankings.csPerMinute}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 킬관여율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-dark text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-people me-2"></i>
                            킬관여율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-dark mb-1">
                                {positionComparison.playerMetrics.killParticipation}%
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.killParticipation}%
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-dark fs-6 px-2 py-1">
                              {positionComparison.rankings.killParticipation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 15분 이전 킬관여율 */}
                    <div className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="card-header bg-info text-white text-center py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-clock me-2"></i>
                            15분전 킬관여율
                          </h6>
                        </div>
                        <div className="card-body text-center py-3">
                          <div className="row align-items-center">
                            <div className="col-6 border-end">
                              <div className="h3 fw-bold text-info mb-1">
                                {avgMetrics.earlyKillParticipation}%
                              </div>
                              <small className="text-muted">내 성과</small>
                            </div>
                            <div className="col-6">
                              <div className="h4 text-secondary mb-1">
                                {positionComparison.averageMetrics.earlyKillParticipation || "N/A"}%
                              </div>
                              <small className="text-muted">포지션 평균</small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="badge bg-info fs-6 px-2 py-1">
                              {positionComparison.rankings.earlyKillParticipation || "순위 계산 중"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 종합 평가 */}
              <div className="card border-0 bg-light">
                <div className="card-body text-center py-4">
                  <h5 className="mb-3">
                    <i className="bi bi-clipboard-check me-2"></i>
                    종합 평가
                  </h5>
                  <p className="mb-0 fs-6">
                    <strong>{positionComparison.position}</strong> 포지션에서 총 <strong>{positionComparison.comparedPlayers + 1}명</strong>의 플레이어와 비교한 결과입니다.
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
          <h5>폼 분석</h5>
          {formAnalysis ? (
            <div>
              {/* 분석 정보 */}
              <div className="alert alert-info mb-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h6 className="mb-1">
                      <i className="bi bi-graph-up"></i> 최근 성과 vs 전체 평균
                    </h6>
                    <small>최근 {formAnalysis.gamesAnalyzed.recent}게임과 전체 {formAnalysis.gamesAnalyzed.total}게임의 성과를 비교합니다</small>
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
                  <div className="card h-100">
                    <div className="card-body text-center">
                      <h6 className="card-title text-primary">KDA</h6>
                      <div className="display-6 fw-bold text-dark mb-2">
                        {formAnalysis.recent.kda.toFixed(2)}
                      </div>
                      <div className="text-muted mb-2">
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
                  <div className="card h-100">
                    <div className="card-body text-center">
                      <h6 className="card-title text-danger">데미지 효율성</h6>
                      <div className="display-6 fw-bold text-dark mb-2">
                        {formAnalysis.recent.damageEfficiency.toFixed(2)}
                      </div>
                      <div className="text-muted mb-2">
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
                  <div className="card h-100">
                    <div className="card-body text-center">
                      <h6 className="card-title text-warning">골드 효율성</h6>
                      <div className="display-6 fw-bold text-dark mb-2">
                        {formAnalysis.recent.goldEfficiency.toFixed(2)}
                      </div>
                      <div className="text-muted mb-2">
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
                  <div className="card h-100">
                    <div className="card-body text-center">
                      <h6 className="card-title text-success">CS/분</h6>
                      <div className="display-6 fw-bold text-dark mb-2">
                        {formAnalysis.recent.csPerMinute.toFixed(1)}
                      </div>
                      <div className="text-muted mb-2">
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
              <div className="card border-0 bg-light">
                <div className="card-body">
                  <h6 className="card-title">
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
                            <p className="mb-2">
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
                <i className="bi bi-graph-down text-muted" style={{fontSize: '3rem'}}></i>
              </div>
              <h6>폼 분석 데이터 부족</h6>
              <p className="text-muted">
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
          <h5>챔피언별 성능 분석</h5>
          {Object.keys(championPerformance).length > 0 ? (
            <div className="row g-3">
              {Object.entries(championPerformance).map(([champion, data]) => (
                <div key={champion} className="col-md-6 col-lg-4 mb-4">
                  <div className="card h-100">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0">
                        <i className="bi bi-person-circle me-2"></i>
                        {champion}
                      </h6>
                    </div>
                    <div className="card-body">
                      {/* 기본 통계 */}
                      <div className="row text-center mb-3">
                        <div className="col-4">
                          <div className="border-end">
                            <h5 className="text-primary mb-1">{data.length}</h5>
                            <small className="text-muted">게임</small>
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="border-end">
                            <h5 className="text-success mb-1">
                              {((data.filter(g => g.win).length / data.length) * 100).toFixed(0)}%
                            </h5>
                            <small className="text-muted">승률</small>
                          </div>
                        </div>
                        <div className="col-4">
                          <h5 className="text-warning mb-1">
                            {(data.reduce((sum, g) => sum + parseFloat(g.kda), 0) / data.length).toFixed(1)}
                          </h5>
                          <small className="text-muted">평균 KDA</small>
                        </div>
                      </div>

                      {/* 트렌드 정보 */}
                      {data.trend && (
                        <div className="mt-3">
                          <h6 className="text-muted mb-2">성장 트렌드</h6>
                          <div className="row">
                            <div className="col-6">
                              <div className="d-flex align-items-center">
                                <span className="me-2">KDA:</span>
                                <span className={`badge ${parseFloat(data.trend.kdaImprovement) >= 0 ? 'bg-success' : 'bg-danger'}`}>
                                  {data.trend.kdaImprovement > 0 ? '+' : ''}{data.trend.kdaImprovement}
                                </span>
                              </div>
                            </div>
                            <div className="col-6">
                              <div className="d-flex align-items-center">
                                <span className="me-2">승률:</span>
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
                <i className="bi bi-person-x text-muted" style={{fontSize: '3rem'}}></i>
              </div>
              <h6>챔피언 데이터 없음</h6>
              <p className="text-muted">
                분석할 챔피언 데이터가 없습니다.<br/>
                게임을 더 플레이해주세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 플레이 스타일 탭 */}
      {activeTab === "style" && (
        <div>
          <h5>플레이 스타일 분석</h5>
          <div className="row g-3">
            {/* 시야 플레이 스타일 */}
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="bi bi-eye"></i> 시야 플레이 스타일
                  </h6>
                </div>
                <div className="card-body">
                  <div className="text-center mb-3">
                    <h4 className="text-primary">{visionStyle.style}</h4>
                  </div>
                  
                  <div className="row text-center mb-3">
                    <div className="col-6">
                      <div className="border-end">
                        <h5 className="text-success mb-1">{visionStyle.wardsPlacedAvg}</h5>
                        <small className="text-muted">평균 와드 설치</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <h5 className="text-danger mb-1">{visionStyle.wardsKilledAvg}</h5>
                      <small className="text-muted">평균 와드 제거</small>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="badge bg-info fs-6">
                      설치/제거 비율: {visionStyle.ratio}
                    </span>
                  </div>

                  {/* 스타일별 설명 */}
                  <div className="mt-3 p-3 bg-light rounded">
                    <small className="text-muted">
                      {visionStyle.style === "수비형 (와드 설치 중심)" && 
                        "팀의 시야 확보에 중점을 두는 안정적인 플레이 스타일입니다."
                      }
                      {visionStyle.style === "공격형 (와드 제거 중심)" && 
                        "상대방의 시야를 차단하는 공격적인 플레이 스타일입니다."
                      }
                      {visionStyle.style === "균형형" && 
                        "와드 설치와 제거를 균형있게 하는 안정적인 플레이 스타일입니다."
                      }
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* 사이드별 성과 상세 */}
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0">
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
                      <span>블루 사이드</span>
                      <span className="fw-bold text-primary">{sidePreference.blueWinRate}%</span>
                    </div>
                    <div className="progress mb-3" style={{height: '8px'}}>
                      <div 
                        className="progress-bar bg-primary" 
                        style={{width: `${sidePreference.blueWinRate}%`}}
                      ></div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>레드 사이드</span>
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
                  <div className="mt-3 p-3 bg-light rounded">
                    <small className="text-muted">
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
              <div className="card text-center h-100">
                <div className="card-body">
                  <div className="mb-2">
                    <i className="bi bi-trophy text-warning" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6 className="card-title">바론</h6>
                  <h4 className="text-warning">{objectiveStats.baron.winRate}%</h4>
                  <small className="text-muted">{objectiveStats.baron.games}게임 참여</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center h-100">
                <div className="card-body">
                  <div className="mb-2">
                    <i className="bi bi-fire text-danger" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6 className="card-title">드래곤</h6>
                  <h4 className="text-danger">{objectiveStats.dragon.winRate}%</h4>
                  <small className="text-muted">{objectiveStats.dragon.games}게임 참여</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center h-100">
                <div className="card-body">
                  <div className="mb-2">
                    <i className="bi bi-eye text-primary" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6 className="card-title">전령</h6>
                  <h4 className="text-primary">{objectiveStats.herald.winRate}%</h4>
                  <small className="text-muted">{objectiveStats.herald.games}게임 참여</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center h-100">
                <div className="card-body">
                  <div className="mb-2">
                    <i className="bi bi-bug text-success" style={{fontSize: '2rem'}}></i>
                  </div>
                  <h6 className="card-title">유충</h6>
                  <h4 className="text-success">{objectiveStats.voidgrub.winRate}%</h4>
                  <small className="text-muted">{objectiveStats.voidgrub.games}게임 참여</small>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {/* 오브젝트 우선순위 */}
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="bi bi-list-ol"></i> 오브젝트 우선순위
                  </h6>
                </div>
                <div className="card-body">
                  {objectivePriority.priority && objectivePriority.priority.length > 0 ? (
                    <div className="list-group list-group-flush">
                      {objectivePriority.priority.slice(0, 4).map((obj, index) => (
                        <div key={index} className="list-group-item d-flex justify-content-between align-items-center px-0">
                          <div className="d-flex align-items-center">
                            <span className={`badge me-3 ${
                              index === 0 ? 'bg-warning' : 
                              index === 1 ? 'bg-secondary' : 
                              index === 2 ? 'bg-dark' : 'bg-light text-dark'
                            }`}>
                              {index + 1}
                            </span>
                            <span>{obj.name || `${index + 1}순위`}</span>
                          </div>
                          {obj.rate && (
                            <small className="text-muted">{obj.rate}%</small>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-3">
                      <i className="bi bi-info-circle mb-2" style={{fontSize: '2rem'}}></i>
                      <p>우선순위 데이터가 없습니다</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 개인 오브젝트 효율성 */}
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="bi bi-person-check"></i> 개인 오브젝트 효율성
                  </h6>
                </div>
                <div className="card-body">
                  {objectiveEfficiency ? (
                    <div>
                      <div className="row text-center mb-3">
                        <div className="col-6">
                          <div className="border-end">
                            <h5 className="text-primary mb-1">{objectiveEfficiency.totalParticipation}</h5>
                            <small className="text-muted">총 참여</small>
                          </div>
                        </div>
                        <div className="col-6">
                          <h5 className="text-success mb-1">{objectiveEfficiency.successRate}%</h5>
                          <small className="text-muted">성공률</small>
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
                    <div className="text-center text-muted py-3">
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
            <div className="card border-0 bg-light">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-lightbulb"></i> 오브젝트 분석 팁
                </h6>
                <div className="row">
                  <div className="col-md-6">
                    <ul className="list-unstyled mb-0">
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <small>바론 승률이 높다면 후반 운영에 강점이 있습니다</small>
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <small>드래곤 승률이 높다면 중반 싸움에 강합니다</small>
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <ul className="list-unstyled mb-0">
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <small>전령 승률이 높다면 초반 라인 우위를 잘 활용합니다</small>
                      </li>
                      <li className="mb-2">
                        <i className="bi bi-check-circle text-success me-2"></i>
                        <small>유충 승률이 높다면 초중반 스노볼링에 능합니다</small>
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