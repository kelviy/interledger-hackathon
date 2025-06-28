from django.contrib.auth.models import Group, User
from rest_framework import permissions, viewsets
from django.http import HttpResponse, JsonResponse, HttpResponseNotFound
from .serializers import GroupSerializer, UserSerializer
from .models import Session, Payment, Product, Grant
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
import requests
import json


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class GroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows groups to be viewed or edited.
    """
    queryset = Group.objects.all().order_by('name')
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]


# ---- endpoints ----
@csrf_exempt
def request_session(request):
    # initialization
    request_payload = json.loads(request.body)
    product_name = request_payload.get("product_name")
    print(product_name)
    product = Product.objects.get(name=product_name)
    json_response = {"product_name": product.name, "rate": product.rate}

    if not(product):
        return HttpResponseNotFound("product is not found in database")

    # Create Session in database
    session = Session(begin_time=timezone.now())
    session.product = product
    session.save()
    json_response["session_id"] = session.pk
    
    # Create a Grant
    sender_wallet = "$ilp.interledger-test.dev/csc"
    receiver_wallet = "$ilp.interledger-test.dev/custom"
    # assuming rate is amount per second
    amount = product.rate

    url = "http://localhost:3001/api/payment/"
    payload = {'senderWalletAddress': sender_wallet, 'receiverWalletAddress': receiver_wallet, 'amount': amount}

    response = requests.post(url, data=payload)
    response_data = response.json()

    grant = Grant(continue_uri=response_data["continueUri"], continue_access=response_data["continueAccessToken"], quote_id=response_data["incoming_payment_id"])
    grant.session = session 
    grant.save()


    
    json_response["redirect_url"] = response_data["interact_redirect"]
    
    return JsonResponse(json_response)

@csrf_exempt
def create_session(request):

    # initialization
    request_payload = json.loads(request.body)
    hash_url = request_payload.get("hash")
    interact_ref = request_payload.get("interact_ref")
    session_id = request_payload.get("session_id")

    if not(session_id):
        return HttpResponseNotFound("session is not found in database")

    session = Session.objects.get(pk = session_id)
    grant = session.grant
    grant.token = interact_ref
    grant.save()
    print(hash_url)
    print(interact_ref)

    return HttpResponse("Success. The session has been created and credentials stored", status=200)

@csrf_exempt
def micropayment(request):
    session_code = request.GET.get("session_id", "")
    json = {}

    session = Session.objects.get(pk = session_code)
    
    if not(session):
        return HttpResponseNotFound("session is not found in database")

    json["product_name"] = session.product.name
    json["rate"] = session.product.rate
    json["session_id"] = session.pk


    payment_info = makeMicroPayment(session)
    print(payment_info)
    session.end_time = timezone.now()
    session.save()

    return JsonResponse(json)

# --- helper functions ---

def makeMicroPayment(session):

    amount = session.product.rate
    interactRef = session.grant.token
    continueuri = session.grant.continue_uri
    continue_access_token = session.grant.continue_access
    quote_id = session.grant.quote_id

    ## hardcoded access
    access_token = '1149E4164D0F358C2804'
    manage_url = https://auth.interledger-test.dev/token/f1e055e9-3b7f-4201-864f-0d1b30ac107d<D-z>

    url = "http://localhost:3001/api/create-payment/"
    payload = {
        'sender_wallet': "https://ilp.interledger-test.dev/csc",
        'interactRef': interactRef,
        'continue_access_token': continue_access_token,
        'continueuri': continueuri,
        'amount': amount,
        'quote_id': quote_id
    }

    response = requests.post(url, json=payload)
    response_data = response.json()
    
    return response_data
