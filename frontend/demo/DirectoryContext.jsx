import {createContext,useContext} from "react";
export const DirectoryContext=createContext(null);
export const useDirectory=()=>useContext(DirectoryContext);
