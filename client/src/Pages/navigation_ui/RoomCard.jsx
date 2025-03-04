import { Box, Card, CardActionArea, Typography } from "@mui/material";
import React from "react";

const RoomCard = ({roomName}) =>
{
    // CardActionArea is used to make the card clickable and then function for navigation

    return (
        <>
        <Box padding='10px'>
            <Card variant="outlined">
                <CardActionArea onClick={() => console.log(roomName)}>
                    <Typography margin='5px'>
                        {roomName}
                    </Typography>
                </CardActionArea>
            </Card>
        </Box>
        </>
    )
}

export default RoomCard