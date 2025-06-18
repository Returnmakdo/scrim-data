import { useState, useEffect } from "react";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import React from "react";
import "./App.css";
import DataTable from "./components/DataTable";
import Navbar from "./components/Navbar";
import FileModal from "./components/FileModal";
import TeamStatsTable from "./components/TeamDataTable";
import AdvancedAnalytics from "./components/AdvancedAnalytics";

function App() {
  const [jsonData, setJsonData] = useState([]);
  const [version, setVersion] = useState("15.8");
  const [fileData, setFileData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState("individual");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "scrimData"));
      const fetchedData = [];
      querySnapshot.forEach((doc) => {
        fetchedData.push({ id: doc.id, ...doc.data() });
      });
      
      // 🔍 gameVersion 값들 확인을 위한 로그
      console.log("=== 모든 gameVersion 값들 ===");
      const allVersions = fetchedData.map(game => game.gameVersion).filter(Boolean);
      const uniqueVersions = [...new Set(allVersions)];
      console.log("고유 버전들:", uniqueVersions);
      
      const versionCounts = {};
      allVersions.forEach(v => {
        versionCounts[v] = (versionCounts[v] || 0) + 1;
      });
      console.log("버전별 게임 수:", versionCounts);
      
      // 15.12 관련 버전 찾기
      const version15_12 = uniqueVersions.filter(v => v.includes("15.12"));
      console.log("15.12 관련 버전들:", version15_12);
      
      setJsonData(fetchedData);
    } catch (e) {
      console.error("데이터 가져오기 실패:", e);
      alert("데이터 가져오기 실패");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileChange = (e) => {
    const files = e.target.files;
    const positionOrder = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

    Array.from(files).forEach((file) => {
      if (file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            if (parsed.participants && Array.isArray(parsed.participants)) {
              parsed.participants.sort((a, b) => {
                return (
                  positionOrder.indexOf(a.INDIVIDUAL_POSITION || a.individualPosition) - positionOrder.indexOf(b.INDIVIDUAL_POSITION || b.individualPosition)
                );
              });
            }
            setFileData((prevData) => [...prevData, parsed]);
          } catch (err) {
            console.warn("JSON 파싱 실패:", err);
          }
        };
        reader.readAsText(file);
      } else {
        alert("JSON 파일만 업로드해주세요.");
      }
    });
  };

  const handleSaveData = async () => {
    if (!fileData || fileData.length === 0) {
      alert("JSON 파일을 먼저 업로드하세요!");
      return;
    }
    closeModal();
    setIsLoading(true);
    try {
      for (const data of fileData) {
        const docRef = await addDoc(collection(db, "scrimData"), data);
        console.log("저장 완료! 문서 ID:", docRef.id);
      }
      alert("모든 데이터 저장 완료!");
      await fetchData(); // 저장 후 데이터 다시 가져오기
    } catch (e) {
      console.error("저장 실패:", e);
      alert("저장 실패");
    } finally {
      setIsLoading(false);
    }
  };

  const versions = Array.from(
    new Set((jsonData || []).map((g) => g.gameVersion?.split(".").slice(0, 2).join(".")))
  ).sort((a, b) => b.localeCompare(a));

  // 🔍 생성된 버전 목록 확인
  console.log("생성된 versions 배열:", versions);

  return (
    <div className="container mt-5">
      <Navbar viewMode={viewMode} setViewMode={setViewMode} version={version} setVersion={setVersion} openModal={openModal } versions={versions}/>
      <FileModal isOpen={isModalOpen} closeModal={closeModal} onFileChange={handleFileChange} onSave={handleSaveData} />
      <div className="content">
        {isLoading ? (
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        ) : (
          <>
            {viewMode === "individual" && <DataTable jsonData={jsonData} version={version} />}
            {viewMode === "team" && <TeamStatsTable jsonData={jsonData} version={version} />}
            {viewMode === "advanced" && <AdvancedAnalytics jsonData={jsonData} version={version} />}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
