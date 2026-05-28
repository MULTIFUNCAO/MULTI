import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"

class EB extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{color:'red',padding:20,fontFamily:'monospace',whiteSpace:'pre-wrap'}}>
        <b>ERRO:</b> {this.state.err.message}<br/>{this.state.err.stack}
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <EB><App /></EB>
)
