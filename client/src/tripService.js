import { db } from "../firebaseConfig";
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
  const tripDoc = await addDoc(tripCollectionRef, {
    userId,
    startPoint: start,
    endPoint: end,
    startTime: serverTimestamp(),
    distance,
    isCompleted: false,
    endTime: null
  });

  return tripDoc.id;
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
