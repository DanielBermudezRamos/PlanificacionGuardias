/*
import { useState } from 'react'
import reactLogo from './assets/react.svg'


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
} // */

import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter,Routes,Route } from "react-router-dom";

import Login from "./pages/Login";
import Guardias from "./pages/Guardias";
import Calendario from "./pages/Calendario";

function App() {

  return(
    <BrowserRouter>
      
      <Routes>npm
        <Route path="/" element={<Login/>} />
        <Route path="/guardias" element={<Guardias/>} />
        <Route path="/calendario" element={<Calendario/>} />  
      </Routes>
    </BrowserRouter>
  );

}

export default App;
