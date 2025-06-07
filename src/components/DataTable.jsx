import React, { useState } from "react";
import { groupBySummonerId } from "../utils/groupBySummonerId";
import { calculateAverage } from "../utils/calculateAverage";
import { calculateWinLossAndRateByChampion } from "../utils/calculateWinLossAndRateByChampion";
import { championNameMap } from "../utils/championNameMap";


const allowedIds = [
  "메이킹서폿",
  "꼬불이",
  "이푸카",
  "막 도",
  "썬 스토리",
  "오늘부터착하게살자",
  "그저 네게 맑아라",
];

const DataTable = ({ jsonData, version }) => {
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

  const handleSelectChange = (e) => {
    setSelectedRiotId(e.target.value);
  };

  const selectedData = groupedData.find(
    (data) =>
      data.participants[0]?.RIOT_ID_GAME_NAME === selectedRiotId ||
      data.participants[0]?.riotIdGameName === selectedRiotId
  );


  // 🔥 version 필터 적용된 데이터
  const versionFilteredParticipants =
    selectedData?.participants.filter((p) => {
      const gv = p.gameVersion;
      return gv?.split(".").slice(0, 2).join(".") === version;
    }) || [];

  return (
    <div>
      {/* Select Box */}
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

      {/* 데이터 테이블 */}
      {selectedData && (
        <div className="mb-5">
          <div className="d-flex flex-column justify-content-center align-items-center mb-3">
            <h5>{selectedRiotId}</h5>
            <span className="badge rounded-pill bg-success">
              게임 횟수: {versionFilteredParticipants.length}회
            </span>
          </div>

          {versionFilteredParticipants.length > 0 ? (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">해봐</th>
                    <th scope="col">킬</th>
                    <th scope="col">데스</th>
                    <th scope="col">어시스트</th>
                    <th scope="col">CS</th>
                    <th scope="col">골드</th>
                    <th scope="col">입힌 데미지(챔피언)</th>
                    <th scope="col">받은 피해</th>
                    <th scope="col">시야 점수</th>
                    <th scope="col">제어와드 구매</th>
                    <th scope="col">와드 제거</th>
                    <th scope="col">와드 설치</th>
                    <th scope="col">15분 이전 킬관여</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">평균</th>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "CHAMPIONS_KILLED",
                        "championsKilled"
                      )}
                    </td>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "NUM_DEATHS",
                        "numDeaths"
                      )}
                    </td>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "ASSISTS",
                        "assists"
                      )}
                    </td>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "Missions_CreepScore",
                        "missionsCreepscore"
                      )}
                    </td>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "GOLD_EARNED",
                        "goldEarned"
                      )}
                    </td>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "TOTAL_DAMAGE_DEALT_TO_CHAMPIONS",
                        "totalDamageDealtToChampions"
                      )}
                    </td>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "TOTAL_DAMAGE_TAKEN",
                        "totalDamageTaken"
                      )}
                    </td>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "VISION_SCORE",
                        "visionScore"
                      )}
                    </td>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "VISION_WARDS_BOUGHT_IN_GAME",
                        "visionWardsBoughtInGame"
                      )}
                    </td>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "WARD_KILLED",
                        "wardKilled"
                      )}
                    </td>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "WARD_PLACED",
                        "wardPlaced"
                      )}
                    </td>
                    <td>
                      {calculateAverage(
                        versionFilteredParticipants,
                        "Missions_TakedownsBefore15Min",
                        "missionsTakedownsbefore15min"
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 챔피언별 승패 및 승률 테이블 */}
              <h5 className="mt-4">챔피언별 승패 및 승률</h5>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">챔피언</th>
                    <th scope="col">승리</th>
                    <th scope="col">패배</th>
                    <th scope="col">승률 (%)</th>
                    <th scope="col">총 게임</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateWinLossAndRateByChampion(
                    versionFilteredParticipants
                  ).map((championData, index) => (
                    <tr key={index}>
                      <td>{championNameMap[championData.champion] || championData.champion}</td>
                      <td>{championData.wins}</td>
                      <td>{championData.losses}</td>
                      <td>{championData.winRate}</td>
                      <td>{championData.totalGames}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div>해당 버전의 기록이 없습니다</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataTable;
