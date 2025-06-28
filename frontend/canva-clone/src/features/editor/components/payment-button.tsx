"use client";

import { useRouter } from "next/navigation";
import { Loader, TriangleAlert } from "lucide-react";

import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";

import { ResponseType, useGetTemplates } from "@/features/projects/api/use-get-templates";
import { useCreateProject } from "@/features/projects/api/use-create-project";

import { Button } from "@/components/ui/button";
import {Rocket, StopCircle, DollarSign} from "lucide-react"
import axios from "axios"
import {useState, useEffect} from "react"

import { useSessionEditor } from "./SessionContext";

export default function PaymentButton() {
  let sessionID="0";
  const { shouldBlock, triggerPaywall } = usePaywall();
  const router = useRouter();
  const mutation = useCreateProject();
  const [timeElapsed, setTimeElapsed] = useState(0)
  const {isPremium, setIsPremium} = useSessionEditor();
  const { 
    data, 
    isLoading, 
    isError
  } = useGetTemplates({ page: "1", limit: "4" });
  
    const [cumulatedAmount, setCumulatedAmount] = useState(0)
    const handlePaymentStart = async() => {
        try{
            // await axios.post("/api/payment/start", {sessionID})
            
            setIsPremium(true)
        }catch (error){
            console.error("Can't start")
        }
    }
    const handlePaymentEnd = async() => {
        try{
            // await axios.post("/api/paymnet/end", {sessionID})
            setIsPremium(false)
        }catch(error){
            console.error("Can't finish")
        }
    }

  const onClick = (template: ResponseType["data"][0]) => {
    if (template.isPro && shouldBlock) {
      triggerPaywall();
      return;
    }

    mutation.mutate(
      {
        name: `${template.name} project`,
        json: template.json,
        width: template.width,
        height: template.height,
      },
      {
        onSuccess: ({ data }) => {
          router.push(`/editor/${data.id}`);
        },
      },
    );
  };

  // // timer
  // useEffect(()=>{

  //   const interval = setInterval(
  //     ()=>{
  //       setTimeElapsed( timeElapsed + 1) 
  //     }, 
  //     1000)
  // })

  return (
    <div className="flex flex-row width-full space-x-8">
      {!isPremium ? 
      <Button variant={"secondary"} onClick={handlePaymentStart} >
         <Rocket className="text-red-600"></Rocket>
         <p className="pl-2 font-medium">Start</p>  
      </Button> :
      <Button variant={"secondary"} onClick={handlePaymentEnd}>
         <p className="pr-2 font-medium">Stop</p>  
         <Rocket className="text-green-600"></Rocket>
      </Button>
    }
      {/* /* <Button variant={"secondary"} >
         <Rocket className="text-red-600"></Rocket>
         <p className="pl-2 font-medium">Start</p>  
      </Button> */}

{/*       
      <Button variant={"secondary"}>
        <DollarSign className="text-xs"></DollarSign>
        <p>Budget</p>
      </Button>
      <Button variant={"secondary"} disabled={true}>{timeElapsed}</Button> */}
    </div>
  );
};

