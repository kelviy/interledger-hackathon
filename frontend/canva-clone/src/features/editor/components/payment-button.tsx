"use client";

import { useRouter } from "next/navigation";
import { Loader, TriangleAlert } from "lucide-react";

import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";

import { ResponseType, useGetTemplates } from "@/features/projects/api/use-get-templates";
import { useCreateProject } from "@/features/projects/api/use-create-project";

import { Button } from "@/components/ui/button";
import {Rocket, StopCircle, DollarSign} from "lucide-react"
import {useState, useEffect} from "react"
import axios from "axios"
import { useSessionEditor } from "./SessionContext";

type PaymentButtonProp = {
  sessionId: string;
  callBackEnd: () => void;
}

type SessionInfo = {
  product_name: string;
  rate: number;         // in cents/rands per sec
  session_id: number;
  redirect_url: string;
};

export default function PaymentButton({ sessionId, callBackEnd }: PaymentButtonProp) {
  const { shouldBlock, triggerPaywall } = usePaywall();
  const router = useRouter();
  const mutation = useCreateProject();
  const [timeElapsed, setTimeElapsed] = useState(0)
  const { isPremium, setIsPremium, setCurrentSessionId } = useSessionEditor();
  const { 
    data, 
    isLoading, 
    isError
  } = useGetTemplates({ page: "1", limit: "4" });
  
    const [cumulatedAmount, setCumulatedAmount] = useState(0)
    // const handlePaymentStart = async() => {
    //     try{
    //         // await axios.post("/api/payment/start", {sessionID})
            
    //         setIsPremium(true)
    //     }catch (error){
    //         console.error("Can't start")
    //     }
    // }
    // const handlePaymentEnd = async() => {
    //     try{
    //         // await axios.post("/api/paymnet/end", {sessionID})
    //         setIsPremium(false)
    //     }catch(error){
    //         console.error("Can't finish")
    //     }
    // }

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

  //handle start payment
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleStart = async () => {
    const redirectUri = `${window.location.origin}/editor/${sessionId}`;
    try {
      const res = await axios.post<SessionInfo>(
        "http://localhost:8000/request_session/",
        {
          product_name: "test",
          client_redirect_url: redirectUri,
        },
        { headers: { "Content-Type": "application/json" } }
      );
      setSessionInfo(res.data);
      setCurrentSessionId(res.data.session_id);
      setModalOpen(true);
    } catch (err) {
      console.error("Failed to request session:", err);
    }
};

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const interact_ref = params.get("interact_ref");
  if (!interact_ref || !sessionInfo) return;
  console.log("interact_ref:", interact_ref);
  console.log("sessionInfo:", sessionInfo);
  console.log("session_id:", sessionInfo.session_id);
  axios
    .post(
      "http://localhost:8000/create_session/",
      {
        session_id: sessionInfo.session_id,
        interact_ref,
      },
      { headers: { "Content-Type": "application/json" } }
    )
    .then(() => {
      setIsPremium(true);
      // clean up the URL so this doesn’t fire again
      window.history.replaceState({}, "", window.location.pathname);
    })
    .catch(console.error);
}, [sessionInfo, setIsPremium]);


  return (
    <>
      <div className="flex flex-row width-full space-x-8">
        {!isPremium ? 
        <Button variant={"secondary"} onClick={handleStart} >
          <Rocket className="text-red-600"></Rocket>
          <p className="pl-2 font-medium">Start</p>  
        </Button> :
        <Button variant={"secondary"} onClick={callBackEnd}>
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

      {/* Approval Modal */}
      {modalOpen && sessionInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-2">{sessionInfo.product_name}</h2>
            <p className="mb-4">
              Rate: R{(sessionInfo.rate / 100).toFixed(2)} / sec
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => {
                  // finally, redirect
                  window.location.href = sessionInfo.redirect_url;
                }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

