import React from "react";
import { calculateTeamStats } from "../utils/calculateTeamStats";

const TeamStatsTable = ({ jsonData, version }) => {
  const versionedStats = calculateTeamStats(jsonData);
  const teamStats = versionedStats[version];

  return (
    <div className="mt-5">
      <h5>팀 지표</h5>
      {teamStats ? (
        <table className="table">
          <thead>
            <tr>
              <th>팀</th>
              <th>바론 킬</th>
              <th>드래곤 킬</th>
              <th>전령 킬</th>
              <th>유충 소환</th>
              <th>아군 타워 파괴</th>
              <th>상대 타워 파괴</th>
              <th>승리</th>
              <th>총 경기 수</th>
              <th>승률</th>
            </tr>
          </thead>
          <tbody>
            {["blue", "red"].map((team) => (
              <tr key={team}>
                <td>{team === "blue" ? "블루팀" : "레드팀"}</td>
                <td>{teamStats[team].baronKills}</td>
                <td>{teamStats[team].dragonKills}</td>
                <td>{teamStats[team].riftHeraldKills}</td>
                <td>{teamStats[team].missionsVoidmitessummoned}</td>
                <td>{teamStats[team].friendlyTurretLost}</td>
                <td>{teamStats[team].turretsKilled}</td>
                <td>{teamStats[team].win}</td>
                <td>{teamStats[team].totalGames}</td>
                <td>{teamStats[team].winRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div>해당 버전의 팀 기록이 없습니다</div>
      )}
    </div>
  );
};

export default TeamStatsTable;
