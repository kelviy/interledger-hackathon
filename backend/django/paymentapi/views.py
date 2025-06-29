from django.contrib.auth.models import Group, User
from rest_framework import permissions, viewsets
from django.http import HttpResponse, JsonResponse, HttpResponseNotFound
from django.views.decorators.http import require_POST
from .serializers import GroupSerializer, UserSerializer
from .models import Session, Payment, Product, Grant
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
import requests
from django.db.models import Sum
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
@require_POST
def request_session(request):
    # initialization
    request_payload = json.loads(request.body)
    product_name = request_payload.get("product_name")
    client_redirect_url =request_payload.get("client_redirect_url")
    print(client_redirect_url)
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
    payload = {'senderWalletAddress': sender_wallet, 
               'receiverWalletAddress': receiver_wallet, 
               'amount': amount,
               'clientRedirectUrl': client_redirect_url}

    response = requests.post(url, data=payload)
    response_data = response.json()

    grant = Grant(incomming_payment_id=response_data["incoming_payment_id"], 
                  debit_amount=response_data["debit_amount"],
                  continue_uri=response_data["continueUri"],
                  continue_access=response_data["continueAccessToken"],
                  quote_id=response_data["quoteId"])
    
    grant.session = session 
    grant.save()

    print(grant.continue_uri)
    print(grant.continue_access)

    
    json_response["redirect_url"] = response_data["interact_redirect"]
    
    return JsonResponse(json_response)

@csrf_exempt
@require_POST
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
    print(grant.continue_uri)
    print(grant.continue_access)

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
    print("old access token:")
    print(session.grant.token)
    print("new access token")
    print(payment_info['token'])
    grant = session.grant
    grant.token = payment_info["token"]
    grant.continue_uri = ""
    grant.manage_url = payment_info["manage_url"]
    session.end_time = timezone.now()
    session.save()
    grant.save()
    print("Cotinue uri")
    print(session.pk, session.grant.continue_uri)

    payment = Payment(session=session, amount=session.product.rate, time=timezone.now())
    payment.save()

    json['total_amount'] = session.payment_set.aggregate(total=Sum('amount')) 
    return JsonResponse(json)

# --- helper functions ---

def makeMicroPayment(session):

    debit_amount = session.grant.debit_amount
    interactRef = session.grant.token
    continueuri = session.grant.continue_uri
    continue_access_token = session.grant.continue_access
    incomming_payment_url = session.grant.incomming_payment_id
    quote_id = session.grant.quote_id
    manage_url = session.grant.manage_url
    receiver_wallet = "$ilp.interledger-test.dev/custom"
    amount = session.product.rate

    print(continueuri)
    print(continue_access_token)

    url = "http://localhost:3001/api/create-payment/"
    payload = {
        'sender_wallet': "https://ilp.interledger-test.dev/csc",
        'interactRef': interactRef,
        'continueAccessToken': continue_access_token,
        'continueUri': continueuri,
        'debit_amount': debit_amount,
        'incommingPaymentUrl': incomming_payment_url,
        'quote_id': quote_id,
        'manage_url': manage_url,
        'receiver_wallet': receiver_wallet,
        'amount': str(amount),
    }

    response = requests.post(url, json=payload)
    response_data = response.json()
    
    return response_data
