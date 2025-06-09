import React from "react";

const Navbar = ({ viewMode, setViewMode, version, setVersion, openModal, versions = [] }) => {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light mb-4">
      <div className="container-fluid">
        <span className="navbar-brand">해봐 스크림 데이터</span>
        <button className="btn btn-primary" onClick={openModal}>
          파일 넣기
        </button>
        <div className="ms-auto">
          <select className="form-select" value={version} onChange={(e) => setVersion(e.target.value)}>
            {(versions || []).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="navbar-nav">
          <button className={`nav-link btn ${viewMode === "individual" ? "active" : ""}`} onClick={() => setViewMode("individual")}>
            개인 지표
          </button>
          <button className={`nav-link btn ${viewMode === "team" ? "active" : ""}`} onClick={() => setViewMode("team")}>
            팀 지표
          </button>
          <button className={`nav-link btn ${viewMode === "advanced" ? "active" : ""}`} onClick={() => setViewMode("advanced")}>
            고급 분석
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
