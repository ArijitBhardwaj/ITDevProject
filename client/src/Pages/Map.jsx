import React, { useState } from "react"
import { Box, Typography } from "@mui/material"
import { useRef, useEffect } from "react"
import mapImage from '../../assets/vcc_floor1.jpg'
import './Map.css'
import mapData from '../../testing/sampleData.json'

const Map = () =>
{

    const [pathCoordinates, setPathCoordinates] = useState([])


    useEffect(() => {
        
        setPathCoordinates(mapData.nodeSequence.map(node =>
        {            
            return [node.x, node.y]
        }))

        // Output testing
        // console.log(pathCoordinates)

        // for(let i of pathCoordinates)
        // {
        //     console.log(i)
        // }
    }, [])    


    // console.log(pathCoordinates)

    function scalePathCoordinatesForImage()
    {                
        return pathCoordinates.map(node =>{
            node[0] += 256
            node[1] += 256            
        })
    }

    return (
        <>
            <Box>
                {pathCoordinates.map((node, index) => (
                    <>
                    <Box key={index}>
                        <Typography>
                            {node[0]}
                            {node[1]}
                        </Typography>
                    </Box>
                    </>
                ))}                
            </Box>
            <Box 
            sx={{
                backgroundImage: `url(${mapImage})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "512px 512px",                                                
            }}>
            <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="renderedPath"
                    width={512}
                    height={512}
                >
                    <polyline
                        points={[[256,256],[0,0]]}
                        style={{fill:"none", stroke:"black", width:3}}
                    />
                </svg>
            </Box>
        </>        
    )
}

export default Map



/*
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="renderedPath"
                    width={512}
                    height={512}
                >
                    <polyline
                        points={pathCoordinates}
                        style={{fill:"none", stroke:"black", width:3}}
                    />
                </svg>
                */