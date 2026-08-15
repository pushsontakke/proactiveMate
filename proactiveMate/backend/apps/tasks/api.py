from ninja import Router

router = Router(tags=["tasks"])

@router.get("/ping/")
async def ping(request):
    return {"status": "ok"}