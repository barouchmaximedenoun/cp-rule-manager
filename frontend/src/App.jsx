import React from "react";
import RuleTable from "./components/RuleTable";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <button className="bg-red-500 text-white p-4">Test Button</button>
      <RuleTable />
    </div>
  );
}

export default App;
