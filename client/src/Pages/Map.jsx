
import React, { useState } from "react"
import { Box, Card, Popover, Typography } from "@mui/material"
import { useRef, useEffect } from "react"
import {TransformWrapper, TransformComponent} from "react-zoom-pan-pinch"
import mapImage from '../../assets/vcc_floor1_grid.png'
import './Map.css'
import mapData from '../../testing/bigSampleData.json'
import traversableData from '../../testing/rooms.json'
import RoomPopup from "./RoomPopup"

const Map = () =>
{

    const [pathCoordinates, setPathCoordinates] = useState([])
    const [traversableNodes, setTraversableNodes] = useState([])



    useEffect(() => {
        
        setPathCoordinates(mapData.nodeSequence.map(node =>
        {            
            return [node.x, node.y]
        }))


        setTraversableNodes(traversableData.map(node =>
        {                        
            return node
        }))

        // Output testing
        // console.log(pathCoordinates)

        // for(let i of pathCoordinates)
        // {
        //     console.log(i)
        // }

        // ============= ANIMATION =============
        var distancePerPoint = 1;
        var drawFPS          = 120;
    
        var pathToAnimate = document.getElementById('animatedPath'), length, timer;
        var mapBox = document.getElementById('mapBox')
        
        mapBox.addEventListener('mouseover',startDrawingPath,false);
        mapBox.addEventListener('mouseout', stopDrawingPath, false);
    
        function startDrawingPath(){
            length = 0;
            // Sets the colour of the line
            // Seems to be a critical component of the re-rendering for some reason
            pathToAnimate.style.stroke = 'blue';
            timer = setInterval(increaseLength,1000/drawFPS);
        }
    
        function increaseLength(){
            var pathLength = pathToAnimate.getTotalLength();
            length += distancePerPoint;
            pathToAnimate.style.strokeDasharray = [length,pathLength].join(' ');
            if (length >= pathLength) clearInterval(timer);
        }
    
        function stopDrawingPath(){
            clearInterval(timer);
            pathToAnimate.style.stroke = '';
            pathToAnimate.style.strokeDasharray = '';
        }
        // ============= ANIMATION =============
        
    }, [])    


    // console.log(pathCoordinates)

    const [scaledFlag, setScaledFlag] = useState(false)

    function scaleTraversableCoordinatesForImage()
    {      
        if(!scaledFlag)
        {            
            const temp = traversableNodes.map(node =>{                                  
                node.coordinates.x = (parseFloat(node.coordinates.x) * (256/20)) + 256
                node.coordinates.y = (parseFloat(node.coordinates.y) * (256/20) * -1) + 256            
                return node
            })        
            // console.log(temp)
            if(temp.length > 0)
                setScaledFlag(true)
            return temp
        }
        else
        {
            return traversableNodes
        }
    }

    function scalePathCoordinatesForImage()
    {      
        const temp = pathCoordinates.map(node =>{
            // console.log(node[0], node[1])            
            node[0] = (node[0] * (256/20)) + 256
            node[1] = (node[1] * (256/20) * -1) + 256
            
            return node
        })
        // console.log(temp)
        return temp
    }

    // console.log(scalePathCoordinatesForImage())
    

    // ================== FOR POPUPS ==================

    const [anchorEl, setAnchorEl] = useState(null)
    const [popoverNodeTarget, setPopoverNodeTarget] = useState(null)

    const openPopover = Boolean(anchorEl)
    const idPopover = openPopover ? 'simple-popover' : undefined

    const handleClick = (node) => (event) =>
    {                
        setAnchorEl(event.currentTarget)
        setPopoverNodeTarget(node)                                
    }


    function handleClose()
    {
        setAnchorEl(null)
    }

    // ================== FOR POPUPS ==================

    return (
        <>
            <TransformWrapper>
                <TransformComponent>
                    <Box 
                    sx={{
                        backgroundImage: `url(${mapImage})`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "512px 512px",                                                
                    }}
                    id = "mapBox"
                    >
                    <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="renderedPath"
                            width={512}
                            height={512}
                        >
                            {/* <polyline
                                points={scalePathCoordinatesForImage()}
                                style={{fill:"none", stroke:"red", width:3}}
                            /> */}

                            <polyline                              
                                points={scalePathCoordinatesForImage()}  
                                style={{fill:"none", stroke:"blue", width:6}}
                                className="animatedPath"
                                id="animatedPath"
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
                        <Popover
                            id={idPopover}
                            open={openPopover}
                            anchorEl={anchorEl}
                            onClose={handleClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left'
                            }}
                        >                                              
                            <Card
                            sx={{padding:"5px", width:"200px"}}>
                                <div style={{display:"flex",justifyContent:"space-around"}}>
                                    <Typography> {popoverNodeTarget ? popoverNodeTarget.name.charAt(0).toUpperCase() + popoverNodeTarget.name.slice(1) : ''} </Typography>
                                    <Typography> {popoverNodeTarget ? popoverNodeTarget.number : ''} </Typography>
                                </div>
                                <Typography sx={{textAlign:"center"}}> {popoverNodeTarget ? popoverNodeTarget.description : ''} </Typography>
                            </Card>
                        </Popover>
                        
                    <svg
                            key={"traversableSVG"}
                            xmlns="http://www.w3.org/2000/svg"
                            className="renderedPath"
                            width={512}
                            height={512}
                        >
                            {scaleTraversableCoordinatesForImage().map((node, index) =>
                        (
                            <>
                                <circle
                                    key={node}
                                    cx={node.coordinates.x} cy={node.coordinates.y}
                                    // width={12} height={12}
                                    r={6}
                                    style={{fill:"orange", stroke:"blue", opacity:"0.5"}}
                                    onClick={(e) => handleClick(node)(e)}
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
