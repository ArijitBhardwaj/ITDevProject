import { db } from "./firebaseConfig";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";

const tripCollectionRef = collection(db, "trips");

export const startTrip = async (userId, start, end, distance) => {
    try {
      const tripDoc = await addDoc(collection(db, "trips"), {
        userId,
        tripStartPoint: start,
        tripEndPoint: end,
        tripStartTime: serverTimestamp(),
        tripDistance: distance,
        completed: false,
        tripEndTime: null,
      });
      console.log("Trip saved with ID:", tripDoc.id);
      return tripDoc.id;
    } catch (error) {
      console.error("Error saving trip:", error);
    }
  };

export const completeTrip = async (tripId) => {
  const tripRef = doc(db, "trips", tripId);
  await updateDoc(tripRef, {
    isCompleted: true,
    endTime: serverTimestamp()
  });
};

export const getUserTrips = async (userId) => {
  const q = query(tripCollectionRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
};
