from django.contrib.auth.models import Group, User
from rest_framework import permissions, viewsets
from django.http import HttpResponse, JsonResponse
from .serializers import GroupSerializer, UserSerializer
from .models import Session, Payment, Product
from django.utils import timezone

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

def micropayment(request, product_name):
    session_code = request.GET.get("session_id", "")
    json = {}

    if not(session_code):
        session = Session(begin_time=timezone.now())
        product = Product.objects.get(name=product_name)
        session.product = product
        session.save()
    else:
        session = Session.objects.get(pk = session_code)

    json["product_name"] = session.product.name
    json["rate"] = session.product.rate
    json["session_id"] = session.pk
    session.end_time = timezone.now()
    session.save()

    return JsonResponse(json)


def makeMicroPayment(amount):
    print("TODO: Assume payment request to express server")
    return "sadf"
