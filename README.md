# big-printer-pal


## Release stuff

### Create a new git tag
```
npm version patch   # new patch version
git push origin <tagname>
```

### How to update a git tag

```
git tag -d <tagname>                  # delete the old tag locally
git push origin :refs/tags/<tagname>  # delete the old tag remotely
git tag <tagname> <commitId>          # make a new tag locally
git push origin <tagname>             # push the new local tag to the remote 
```
