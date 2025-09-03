import { Button } from "@mui/material";
import { Helmet } from "react-helmet";
import { NavLink } from "react-router-dom";

function NotFound() {
    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: "column",
            background:"var(--bgColor)"
        }}>
            <Helmet title={`404 | CyberBot`} />
            <div style={{
                margin: "auto",
                textAlign: "center",
            }}>
                <p style={{
                    fontSize: "10rem",
                    letterSpacing: "6px"
                }}>404</p>
                <p style={{
                    fontSize: "2rem",
                    opacity: ".6",
                    margin: "0 0 24px"
                }}>Not Found</p>
                <NavLink to="/">
                    <Button variant="contained" size="large">BACK TO HOME</Button>
                </NavLink>
            </div>
        </div >
    );
}

export default NotFound;