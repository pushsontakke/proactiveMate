from ninja import NinjaAPI

from apps.tasks.api import router as tasks_router


api = NinjaAPI(title="ProactiveMate API", version="1", docs_url="/docs")

api.add_router("/tasks/", tasks_router)