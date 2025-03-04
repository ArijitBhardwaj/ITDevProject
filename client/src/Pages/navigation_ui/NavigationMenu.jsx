import { Box, Button, TextField } from "@mui/material"
import React, { useEffect, useState } from "react"
import RoomCard from "./RoomCard"

const NavigationMenu = () =>
{
    const [rooms, setRooms] = useState([])    
    const [searchParams, setSearchParams] = useState('')

    // TODO : dynamically change the room map according to this variable
    const [filteredRooms, setFilteredRooms] = useState([])

    // TODO : needs to be an async function when calling from the database later
    const getRooms = () =>
    {
        const roomsFound = [
            {
                name: "Room 1",
                tags: ["floor 1", "lab"]
            },
            {
                name: "Room 2",
                tags: ["floor 1", "class"]
            },
            {
                name: "Room 3",
                tags: ["floor 2", "class"]
            },
            {
                name: "Room 4",
                tags: ["floor 2", "bathroom"]
            },
            {
                name: "Room 5",
                tags: ["floor 3", "bathroom"]
            }
            
        ]        
        setRooms(roomsFound)
        setFilteredRooms(roomsFound)
    }

    const getFilteredRooms = () =>
    {
        // Every comma is an additional tag maybe
        // Use regex to separate into groups        
        const re = /([a-zA-Z 0-9]+),?/g
        
        console.log("The Filters Before", searchParams.match(re))

        let filtersFound = searchParams.toLowerCase().match(re)

        // removing whitespace and commas
        filtersFound = filtersFound.map((filt) =>
        {
            return filt.replace( /^[, ]*/, '').replace(/[, ]*$/, '')
        })

        console.log("The Filters After", filtersFound)
        
        // Filter rooms according to the conditions passed
        setFilteredRooms(rooms.filter((room) =>
        {
            for(var i of filtersFound)
            {
                if(room.tags.includes(i))
                {
                    return true
                }
            }
            return false
        }))
    }

    useEffect(() =>
    {
        getRooms()
    }, [])

    return (
        <>
        <Box>
            {/* Search Bar */}
            <TextField 
                value={searchParams || ''} 
                onChange={(e) => setSearchParams(e.target.value)}
                sx={{input: {color: 'green'}}}
            ></TextField>
            {/* Search button 
            We can also leave it so that the text field searches dynamically as its contents are changed
            */}            
            <Button variant="contained" onClick={getFilteredRooms}>Search</Button>

            {/* Rooms listings */}
            <Box display='grid' gridTemplateColumns='auto auto auto'>
            {filteredRooms.map((room) =>(                
                <>                
                <RoomCard 
                    roomName = {room.name}
                ></RoomCard>
                </>
            ))}
            </Box>
        </Box>
        </>
    )
}

export default NavigationMenu