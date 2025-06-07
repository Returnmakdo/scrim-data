export const groupBySummonerId = (jsonData) => {
  const grouped = jsonData.reduce((acc, data) => {
    const gameVersion = data.gameVersion;

    data.participants.forEach((participant) => {
      const summonerId = participant.summonerId || participant.SUMMONER_ID;
      if (!acc[summonerId]) {
        acc[summonerId] = {
          summonerId,
          participants: [],
        };
      }

      // ✅ 🔥 여기에 gameVersion 직접 주입
      acc[summonerId].participants.push({
        ...participant,
        gameVersion, // <-- 요거 추가!
      });
    });

    return acc;
  }, {});

  return Object.values(grouped);
};
