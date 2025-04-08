import React, { useState } from "react"
import { Box, Typography } from "@mui/material"
import { useRef, useEffect } from "react"
import {TransformWrapper, TransformComponent} from "react-zoom-pan-pinch"
import mapImage from '../../assets/vcc_floor1_grid.png'
import './Map.css'
import mapData from '../../testing/sampleData.json'
import traversableData from '../../testing/traversable.json'

const Map = () =>
{

    const [pathCoordinates, setPathCoordinates] = useState([])
    const [traversableCoordinates, setTraversableCoordinates] = useState([])


    useEffect(() => {
        
        setPathCoordinates(mapData.nodeSequence.map(node =>
        {            
            return [node.x, node.y]
        }))


        setTraversableCoordinates(traversableData.map(node =>
        {            
            return [node.coordinates.x, node.coordinates.y]
        }))
        // Output testing
        // console.log(pathCoordinates)

        // for(let i of pathCoordinates)
        // {
        //     console.log(i)
        // }
    }, [])    


    // console.log(pathCoordinates)

    function scaleTraversableCoordinatesForImage()
    {      
        const temp = traversableCoordinates.map(node =>{                      
            node[0] = (node[0] * (256/20)) + 256
            node[1] = (node[1] * (256/20)) + 256
            
            return node
        })        
        return temp
    }

    function scalePathCoordinatesForImage()
    {      
        const temp = pathCoordinates.map(node =>{
            console.log(node[0], node[1])            
            node[0] = (node[0] * (256/20)) + 256
            node[1] = (node[1] * (256/20)) + 256
            
            return node
        })
        console.log(temp)
        return temp
    }

    // console.log(scalePathCoordinatesForImage())

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
            <TransformWrapper>
                <TransformComponent>
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
                                points={scalePathCoordinatesForImage()}
                                style={{fill:"none", stroke:"red", width:3}}
                            />
                        </svg>
                    </Box>
                </TransformComponent>
            </TransformWrapper>
            <TransformWrapper>
                <TransformComponent>
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
                            {scaleTraversableCoordinatesForImage().map((node, index) =>
                        (
                            <>
                                <circle
                                    cx={node[0]} cy={node[1]}
                                    // width={12} height={12}
                                    r={6}
                                    style={{fill:"orange", stroke:"blue"}}
                                />
                            </>
                        ))}
                        </svg>
                    </Box>
                </TransformComponent>
            </TransformWrapper>
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